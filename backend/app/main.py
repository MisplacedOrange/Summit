from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import hashlib
import json
import logging
import math
from pathlib import Path

from fastapi import Depends, FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.router import api_router
from app.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.db.session import engine
from app.models.opportunity import Opportunity
from app.services.gemini import gemini_service
import app.models  # noqa: F401

logger = logging.getLogger(__name__)


async def _run_sqlite_compat_migrations() -> None:
    """Patch older local SQLite schemas to match current models without manual reset."""
    if engine.dialect.name != "sqlite":
        return

    async with engine.begin() as conn:
        exists_result = await conn.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if exists_result.first() is None:
            return

        columns_result = await conn.exec_driver_sql("PRAGMA table_info(users)")
        columns = {row[1] for row in columns_result.fetchall()}

        if "avatar_url" not in columns:
            await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN avatar_url TEXT")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await _run_sqlite_compat_migrations()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="ImpactMatch API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LegacyOpportunity(BaseModel):
    id: str
    title: str
    organization: str
    description: str
    url: str
    cause: str
    location: str
    schedule: str
    volunteers_needed: int
    skills: list[str]
    urgency: str
    score: float = 0.0
    match_pct: int = 0
    match_reason: str = ""
    latitude: float
    longitude: float


class LegacyOpportunityResponse(BaseModel):
    query: str
    count: int
    source: str
    items: list[LegacyOpportunity]


class LegacyRecommendationRequest(BaseModel):
    interests: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    availability: str = "weekends"
    location: str = "Toronto"
    max_distance_km: int = 20
    limit: int = Field(default=16, ge=1, le=50)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_km = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return earth_km * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def _geocode_location(location_text: str, seed: str) -> tuple[float, float]:
    """Return real coordinates for a location string, with small jitter to avoid stacking."""
    coords = _city_coords(location_text) if location_text else None
    if coords:
        digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
        jitter_lat = (int(digest[:4], 16) % 200 - 100) / 10000.0
        jitter_lng = (int(digest[4:8], 16) % 200 - 100) / 10000.0
        return round(coords[0] + jitter_lat, 6), round(coords[1] + jitter_lng, 6)
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    lat = 43.62 + (int(digest[:8], 16) % 2400) / 10000.0
    lon = -79.52 + (int(digest[8:16], 16) % 3200) / 10000.0
    return round(lat, 6), round(lon, 6)


def _build_legacy_item(opp: Opportunity, score: float = 0.0) -> LegacyOpportunity:
    seed = opp.source_url or opp.id
    fallback_lat, fallback_lon = _geocode_location(opp.location_text or "", seed)
    location_lat = float(opp.location_lat) if opp.location_lat is not None else fallback_lat
    location_lng = float(opp.location_lng) if opp.location_lng is not None else fallback_lon
    needed = int(opp.volunteers_needed or 1)
    signed = int(opp.volunteers_signed or 0)
    remaining = max(0, needed - signed)
    urgency = "high" if remaining >= 10 else "medium" if remaining >= 4 else "low"
    return LegacyOpportunity(
        id=opp.id,
        title=opp.title,
        organization="ImpactMatch Organization",
        description=opp.description,
        url=opp.source_url or "#",
        cause=opp.cause_category or "community",
        location=opp.location_text or "Toronto",
        schedule="Flexible / Posted online",
        volunteers_needed=needed,
        skills=list(opp.skills_required or []),
        urgency=urgency,
        score=round(float(score), 2),
        latitude=location_lat,
        longitude=location_lng,
    )


def _load_legacy_seed_items(limit: int) -> list[LegacyOpportunity]:
    repo_root = Path(__file__).resolve().parents[2]
    candidates = [repo_root / "static_opportunities.json", repo_root / "opportunities.json"]

    rows: list[dict[str, object]] = []
    for path in candidates:
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(data, list) and data:
            rows = [item for item in data if isinstance(item, dict)]
            break

    items: list[LegacyOpportunity] = []
    for index, row in enumerate(rows[:limit], start=1):
        title = str(row.get("title", "Volunteer Opportunity")).strip() or "Volunteer Opportunity"
        link = str(row.get("link", row.get("url", "#"))).strip() or "#"
        location_text = str(row.get("location", "Toronto")).strip() or "Toronto"
        lat = row.get("latitude")
        lon = row.get("longitude")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            lat, lon = _geocode_location(location_text, link + title)

        category = str(row.get("cause", row.get("category", "community"))).strip() or "community"
        skills_raw = row.get("skills", [])
        skills = [str(item).strip() for item in skills_raw if str(item).strip()] if isinstance(skills_raw, list) else []
        volunteers_needed = row.get("volunteers_needed", 6)
        try:
            volunteers_needed_int = int(volunteers_needed)
        except Exception:
            volunteers_needed_int = 6
        urgency = "high" if volunteers_needed_int >= 10 else "medium" if volunteers_needed_int >= 4 else "low"

        items.append(
            LegacyOpportunity(
                id=str(row.get("id", f"seed-{index}")),
                title=title,
                organization=str(row.get("organization", "ImpactMatch Organization")).strip() or "ImpactMatch Organization",
                description=str(row.get("description", "Volunteer opportunity")).strip() or "Volunteer opportunity",
                url=link,
                cause=category,
                location=str(row.get("location", "Toronto")).strip() or "Toronto",
                schedule=str(row.get("schedule", row.get("time_commitment", "Flexible / Posted online"))).strip() or "Flexible / Posted online",
                volunteers_needed=max(1, volunteers_needed_int),
                skills=skills,
                urgency=urgency,
                score=float(row.get("score", 0.0) or 0.0),
                latitude=float(lat),
                longitude=float(lon),
            )
        )

    return items


def _score_legacy(opp: Opportunity, q: str, interests: list[str], skills: list[str], location: str) -> float:
    haystack = f"{opp.title} {opp.description} {opp.cause_category or ''}".lower()
    score = 0.0
    if q and q.lower() in haystack:
        score += 2.0
    for token in interests:
        token_l = token.strip().lower()
        if token_l and token_l in haystack:
            score += 1.3
    for token in skills:
        token_l = token.strip().lower()
        if token_l and token_l in [str(s).lower() for s in (opp.skills_required or [])]:
            score += 1.6
    if location and location.lower() in (opp.location_text or "").lower():
        score += 1.0
    return score


@app.get("/api/volunteer-organizations", response_model=LegacyOpportunityResponse)
async def legacy_discover(
    q: str = Query(default="volunteer opportunities"),
    cause: str = Query(default=""),
    location: str = Query(default="Toronto"),
    interests: str = Query(default=""),
    skills: str = Query(default=""),
    limit: int = Query(default=16, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> LegacyOpportunityResponse:
    rows = list((await db.execute(select(Opportunity))).scalars().all())
    if not rows:
        items = _load_legacy_seed_items(limit=limit)
        return LegacyOpportunityResponse(
            query=q,
            count=len(items),
            source="ImpactMatch file fallback (opportunities.json/static_opportunities.json)",
            items=items,
        )

    if cause:
        rows = [item for item in rows if (item.cause_category or "").lower() == cause.lower()]

    interest_tokens = [item.strip() for item in interests.split(",") if item.strip()]
    skill_tokens = [item.strip() for item in skills.split(",") if item.strip()]

    scored = [(_score_legacy(item, q, interest_tokens, skill_tokens, location), item) for item in rows]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    items = [_build_legacy_item(item, score=score) for score, item in scored[:limit]]

    return LegacyOpportunityResponse(
        query=q,
        count=len(items),
        source="ImpactMatch API compatibility layer",
        items=items,
    )


# ---------------------------------------------------------------------------
# Embedding helpers & in-memory cache for AI matching
# ---------------------------------------------------------------------------

_embedding_cache: dict[str, list[float]] = {}


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


async def _get_embedding(text: str) -> list[float]:
    """Return a cached embedding or compute one via Gemini / fallback."""
    key = hashlib.sha256(text.encode()).hexdigest()
    if key in _embedding_cache:
        return _embedding_cache[key]
    emb = await gemini_service.embed(text)
    _embedding_cache[key] = emb
    return emb


def _build_match_reason(
    sim: float,
    skill_overlap: list[str],
    location_match: bool,
    urgency: str,
) -> str:
    """Build a human-readable explanation of why an opportunity matched."""
    parts: list[str] = []
    if sim >= 0.82:
        parts.append("Strong alignment with your interests")
    elif sim >= 0.65:
        parts.append("Good alignment with your interests")
    elif sim >= 0.45:
        parts.append("Moderate alignment with your interests")
    if skill_overlap:
        parts.append(f"Matches your skills: {', '.join(skill_overlap[:3])}")
    if location_match:
        parts.append("Near your location")
    if urgency == "high":
        parts.append("High urgency – volunteers needed now")
    return ". ".join(parts) + "." if parts else "Potential match based on overall profile."


async def _ai_score_seed_item(
    item: LegacyOpportunity,
    profile_emb: list[float],
    user_skills: list[str],
    user_location: str,
    max_distance_km: int,
) -> tuple[float, int, str]:
    """Score a seed LegacyOpportunity using embedding similarity + signals."""
    opp_text = f"{item.title}. {item.description}. Category: {item.cause}. Skills: {', '.join(item.skills)}"
    opp_emb = await _get_embedding(opp_text)

    sim = _cosine_similarity(profile_emb, opp_emb)

    # Skill overlap bonus
    user_skills_lower = {s.lower() for s in user_skills}
    opp_skills_lower = {s.lower() for s in item.skills}
    overlap = sorted(user_skills_lower & opp_skills_lower)
    skill_bonus = min(len(overlap) * 0.08, 0.24)

    # Location proximity bonus
    location_match = user_location.lower() in item.location.lower()
    loc_bonus = 0.10 if location_match else 0.0

    # Urgency bonus
    urgency_bonus = 0.06 if item.urgency == "high" else 0.02 if item.urgency == "medium" else 0.0

    raw_score = sim + skill_bonus + loc_bonus + urgency_bonus
    match_pct = max(1, min(99, int(raw_score * 70)))
    reason = _build_match_reason(sim, overlap, location_match, item.urgency)
    return raw_score, match_pct, reason


async def _ai_score_db_row(
    row: Opportunity,
    profile_emb: list[float],
    user_skills: list[str],
    user_location: str,
    max_distance_km: int,
) -> tuple[float, int, str]:
    """Score a DB Opportunity row using embedding similarity + signals."""
    opp_text = f"{row.title}. {row.description}. Category: {row.cause_category or 'general'}. Skills: {', '.join(row.skills_required or [])}"
    opp_emb = await _get_embedding(opp_text)

    sim = _cosine_similarity(profile_emb, opp_emb)

    user_skills_lower = {s.lower() for s in user_skills}
    opp_skills_lower = {s.lower() for s in (row.skills_required or [])}
    overlap = sorted(user_skills_lower & opp_skills_lower)
    skill_bonus = min(len(overlap) * 0.08, 0.24)

    location_match = user_location.lower() in (row.location_text or "").lower()
    loc_bonus = 0.10 if location_match else 0.0

    needed = int(row.volunteers_needed or 1)
    signed = int(row.volunteers_signed or 0)
    remaining = max(0, needed - signed)
    urgency = "high" if remaining >= 10 else "medium" if remaining >= 4 else "low"
    urgency_bonus = 0.06 if urgency == "high" else 0.02 if urgency == "medium" else 0.0

    # Proximity bonus (haversine)
    prox_bonus = 0.0
    if row.location_lat is not None and row.location_lng is not None:
        ref_coords = _city_coords(user_location)
        if ref_coords:
            dist = _haversine_km(ref_coords[0], ref_coords[1], float(row.location_lat), float(row.location_lng))
            if dist <= max_distance_km:
                prox_bonus = max(0.0, 0.12 * (1 - dist / max_distance_km))
                location_match = True

    raw_score = sim + skill_bonus + loc_bonus + prox_bonus + urgency_bonus
    match_pct = max(1, min(99, int(raw_score * 70)))
    reason = _build_match_reason(sim, overlap, location_match, urgency)
    return raw_score, match_pct, reason


def _city_coords(location: str) -> tuple[float, float] | None:
    """Return (lat, lng) for well-known city names."""
    cities: dict[str, tuple[float, float]] = {
        "toronto": (43.6532, -79.3832),
        "mississauga": (43.5890, -79.6441),
        "brampton": (43.7315, -79.7624),
        "markham": (43.8561, -79.3370),
        "scarborough": (43.7731, -79.2578),
        "north york": (43.7615, -79.4111),
        "etobicoke": (43.6205, -79.5132),
        "vaughan": (43.8361, -79.4983),
        "richmond hill": (43.8828, -79.4403),
        "oakville": (43.4675, -79.6877),
        "hamilton": (43.2557, -79.8711),
        "gta": (43.7001, -79.4163),
        "remote": (43.6532, -79.3832),
        "vancouver": (49.2827, -123.1207),
        "montreal": (45.5017, -73.5673),
        "ottawa": (45.4215, -75.6972),
        "calgary": (51.0447, -114.0719),
        "edmonton": (53.5461, -113.4938),
        "winnipeg": (49.8951, -97.1384),
        "halifax": (44.6488, -63.5752),
        "victoria": (48.4284, -123.3656),
        "kitchener": (43.4516, -80.4925),
        "london": (42.9849, -81.2453),
        "waterloo": (43.4643, -80.5204),
    }
    loc = location.strip().lower()
    if loc in cities:
        return cities[loc]
    for key in cities:
        if key in loc or loc in key:
            return cities[key]
    return None


@app.post("/api/recommendations", response_model=LegacyOpportunityResponse)
async def legacy_recommendations(
    payload: LegacyRecommendationRequest,
    db: AsyncSession = Depends(get_db),
) -> LegacyOpportunityResponse:
    # Build user profile text and embed it
    profile_parts = []
    if payload.interests:
        profile_parts.append(f"Interests: {', '.join(payload.interests)}")
    if payload.skills:
        profile_parts.append(f"Skills: {', '.join(payload.skills)}")
    if payload.availability:
        profile_parts.append(f"Availability: {payload.availability}")
    if payload.location:
        profile_parts.append(f"Location: {payload.location}")
    profile_text = ". ".join(profile_parts) or "volunteer opportunities"

    try:
        profile_emb = await _get_embedding(profile_text)
    except Exception:
        logger.warning("Embedding generation failed; falling back to keyword scoring")
        profile_emb = []

    query_label = " ".join(payload.interests) if payload.interests else "AI recommendations"

    # --- DB path ---------------------------------------------------------
    rows = list((await db.execute(select(Opportunity))).scalars().all())
    if rows:
        scored: list[tuple[float, int, str, Opportunity]] = []
        for row in rows:
            raw, pct, reason = await _ai_score_db_row(
                row, profile_emb, payload.skills, payload.location, payload.max_distance_km,
            )
            scored.append((raw, pct, reason, row))
        scored.sort(key=lambda t: t[0], reverse=True)

        items: list[LegacyOpportunity] = []
        for raw, pct, reason, row in scored[: payload.limit]:
            item = _build_legacy_item(row, score=raw)
            item.match_pct = pct
            item.match_reason = reason
            items.append(item)

        return LegacyOpportunityResponse(
            query=query_label,
            count=len(items),
            source="ImpactMatch AI matching",
            items=items,
        )

    # --- Seed-file fallback path -----------------------------------------
    seed_items = _load_legacy_seed_items(limit=50)
    scored_seed: list[tuple[float, int, str, LegacyOpportunity]] = []
    for item in seed_items:
        raw, pct, reason = await _ai_score_seed_item(
            item, profile_emb, payload.skills, payload.location, payload.max_distance_km,
        )
        scored_seed.append((raw, pct, reason, item))
    scored_seed.sort(key=lambda t: t[0], reverse=True)

    result_items: list[LegacyOpportunity] = []
    for raw, pct, reason, item in scored_seed[: payload.limit]:
        item.score = round(raw, 2)
        item.match_pct = pct
        item.match_reason = reason
        result_items.append(item)

    return LegacyOpportunityResponse(
        query=query_label,
        count=len(result_items),
        source="ImpactMatch AI matching (seed data)",
        items=result_items,
    )
@app.get("/")
async def read_root() -> dict[str, str]:
    return {"message": "ImpactMatch backend is running"}


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, __: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred."})


app.include_router(api_router, prefix="/v1")
