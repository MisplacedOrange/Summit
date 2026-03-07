from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import hashlib
import math

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
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
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


def _stable_coord(seed: str) -> tuple[float, float]:
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    lat_component = int(digest[:8], 16) % 2400
    lon_component = int(digest[8:16], 16) % 3200
    lat = 43.62 + lat_component / 10000.0
    lon = -79.52 + lon_component / 10000.0
    return round(lat, 6), round(lon, 6)


def _build_legacy_item(opp: Opportunity, score: float = 0.0) -> LegacyOpportunity:
    seed = opp.source_url or opp.id
    lat, lon = _stable_coord(seed)
    location_lat = float(opp.location_lat) if opp.location_lat is not None else lat
    location_lng = float(opp.location_lng) if opp.location_lng is not None else lon
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


@app.post("/api/recommendations", response_model=LegacyOpportunityResponse)
async def legacy_recommendations(
    payload: LegacyRecommendationRequest,
    db: AsyncSession = Depends(get_db),
) -> LegacyOpportunityResponse:
    rows = list((await db.execute(select(Opportunity))).scalars().all())

    scored: list[tuple[float, Opportunity]] = []
    for row in rows:
        score = _score_legacy(row, " ".join(payload.interests), payload.interests, payload.skills, payload.location)
        if row.location_lat is not None and row.location_lng is not None and payload.location.lower() == "toronto":
            toronto_lat, toronto_lng = 43.6532, -79.3832
            distance = _haversine_km(toronto_lat, toronto_lng, float(row.location_lat), float(row.location_lng))
            if distance <= payload.max_distance_km:
                score += 1.0
        scored.append((score, row))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    items = [_build_legacy_item(item, score=score) for score, item in scored[: payload.limit]]

    return LegacyOpportunityResponse(
        query=" ".join(payload.interests) if payload.interests else "recommendations",
        count=len(items),
        source="ImpactMatch recommendation compatibility layer",
        items=items,
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
