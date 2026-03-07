from __future__ import annotations

import math
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.opportunity import Opportunity
from app.models.user import UserPreference
from app.services.gemini import gemini_service


def build_profile_text(preferences: UserPreference) -> str:
    interests = ", ".join(preferences.interests or [])
    skills = ", ".join(preferences.skills or [])
    return f"Interests: {interests}. Skills: {skills}."


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b, strict=False))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _coerce_embedding(value: object) -> list[float]:
    if value is None:
        return []
    if isinstance(value, list):
        return [float(v) for v in value]
    if hasattr(value, "tolist"):
        converted = value.tolist()
        if isinstance(converted, list):
            return [float(v) for v in converted]
    if hasattr(value, "__iter__"):
        return [float(v) for v in value]  # type: ignore[arg-type]
    return []


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_km = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_km * c


async def update_user_embedding(db: AsyncSession, preferences: UserPreference) -> None:
    profile_text = build_profile_text(preferences)
    preferences.embedding = await gemini_service.embed(profile_text)
    db.add(preferences)
    await db.commit()


async def get_candidate_opportunities(db: AsyncSession, limit: int = 100) -> list[Opportunity]:
    result = await db.execute(select(Opportunity).limit(limit))
    return list(result.scalars().all())


def score_opportunity(
    opp: Opportunity,
    user_embedding: list[float],
    user_lat: float | None,
    user_lng: float | None,
) -> float:
    similarity_score = cosine_similarity(user_embedding, _coerce_embedding(opp.embedding))

    proximity_boost = 0.0
    if user_lat is not None and user_lng is not None and opp.location_lat is not None and opp.location_lng is not None:
        distance_km = haversine(user_lat, user_lng, opp.location_lat, opp.location_lng)
        proximity_boost = max(0.0, 1.0 - (distance_km / 50.0))

    needed = opp.volunteers_needed or 0
    signed = opp.volunteers_signed or 0
    demand_ratio = (needed - signed) / max(needed, 1)
    demand_boost = demand_ratio * 0.3

    recency_boost = 0.0
    if opp.event_date is not None:
        days_until = (opp.event_date - date.today()).days
        recency_boost = max(0.0, 1.0 - (days_until / 30.0)) * 0.2

    return float(similarity_score + proximity_boost + demand_boost + recency_boost)


async def get_recommendations(
    db: AsyncSession,
    preferences: UserPreference,
    limit: int = 20,
) -> list[tuple[Opportunity, float]]:
    embedding = _coerce_embedding(preferences.embedding)
    if len(embedding) == 0:
        await update_user_embedding(db, preferences)
        embedding = _coerce_embedding(preferences.embedding)

    candidates = await get_candidate_opportunities(db)
    scored = [
        (
            opp,
                score_opportunity(opp, embedding, preferences.location_lat, preferences.location_lng),
        )
        for opp in candidates
    ]
    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[:limit]
