from __future__ import annotations

from datetime import date
import math
<<<<<<< Updated upstream
=======
import re
>>>>>>> Stashed changes

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.opportunity import Opportunity
from app.models.user import UserPreference
from app.config import settings
from app.services.gemini import gemini_service
from app.services.location import haversine_km


def build_profile_text(preferences: UserPreference) -> str:
    interests = ", ".join(preferences.interests or [])
    skills = ", ".join(preferences.skills or [])
    return f"Interests: {interests}. Skills: {skills}."


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


# Keep old name as alias for backwards compat
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return haversine_km(lat1, lon1, lat2, lon2)


def build_opportunity_text(opportunity: Opportunity) -> str:
    skills = ", ".join(opportunity.skills_required or [])
    cause = opportunity.cause_category or ""
    location = opportunity.location_text or ""
    return f"Title: {opportunity.title}. Cause: {cause}. Description: {opportunity.description}. Skills: {skills}. Location: {location}."


async def update_user_embedding(db: AsyncSession, preferences: UserPreference) -> None:
    profile_text = build_profile_text(preferences)
    preferences.embedding = await gemini_service.embed(profile_text)
    db.add(preferences)
    await db.commit()


def _tokenize(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", value.lower()) if len(token) > 2}


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0

    dot_product = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    cosine = dot_product / (left_norm * right_norm)
    return max(0.0, min(1.0, (cosine + 1.0) / 2.0))


def _overlap_ratio(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    return len(left & right) / max(len(left), 1)


def _jaccard_similarity(left: set[str], right: set[str]) -> float:
    union = left | right
    if not union:
        return 0.0
    return len(left & right) / len(union)


async def _ensure_opportunity_embeddings(db: AsyncSession, opportunities: list[Opportunity]) -> None:
    missing_embeddings = [opp for opp in opportunities if len(_coerce_embedding(opp.embedding)) == 0]
    if not missing_embeddings:
        return

    for opp in missing_embeddings:
        opp.embedding = await gemini_service.embed(build_opportunity_text(opp))
        db.add(opp)

    await db.commit()
    for opp in missing_embeddings:
        await db.refresh(opp)


def _semantic_similarity(
    preference_embedding: list[float],
    opportunity_embedding: list[float],
    profile_tokens: set[str],
    opportunity_tokens: set[str],
) -> float:
    lexical_similarity = _jaccard_similarity(profile_tokens, opportunity_tokens)
    if settings.GEMINI_API_KEY and preference_embedding and opportunity_embedding:
      embedding_similarity = _cosine_similarity(preference_embedding, opportunity_embedding)
      return max(lexical_similarity, embedding_similarity)
    return lexical_similarity


def _build_reason(
    opportunity: Opportunity,
    interest_matches: set[str],
    skill_matches: set[str],
    proximity_score: float,
    demand_score: float,
) -> str:
    reasons: list[str] = []
    if interest_matches:
        reasons.append(f"Matches your interests in {', '.join(sorted(interest_matches)[:2])}")
    if skill_matches:
        reasons.append(f"Uses your skills in {', '.join(sorted(skill_matches)[:2])}")
    if proximity_score >= 0.6:
        reasons.append("Close to your preferred location")
    if demand_score >= 0.7:
        reasons.append("High volunteer need right now")
    if opportunity.cause_category and not reasons:
        reasons.append(f"Relevant to {opportunity.cause_category.replace('-', ' ')} opportunities")
    return ". ".join(reasons[:2]) or "Strong overall match for your profile"


def _score_opportunity(
    opportunity: Opportunity,
    preferences: UserPreference,
    preference_embedding: list[float],
) -> tuple[float, str]:
    profile_text = build_profile_text(preferences)
    opportunity_text = build_opportunity_text(opportunity)
    profile_tokens = _tokenize(profile_text)
    opportunity_tokens = _tokenize(opportunity_text)
    interest_tokens = {normalize for value in preferences.interests or [] for normalize in _tokenize(value)}
    skill_tokens = {normalize for value in preferences.skills or [] for normalize in _tokenize(value)}
    opportunity_embedding = _coerce_embedding(opportunity.embedding)

    semantic_score = _semantic_similarity(preference_embedding, opportunity_embedding, profile_tokens, opportunity_tokens)
    interest_matches = interest_tokens & opportunity_tokens
    skill_matches = skill_tokens & opportunity_tokens
    interest_score = _overlap_ratio(interest_tokens, opportunity_tokens)
    skill_score = _overlap_ratio(skill_tokens, opportunity_tokens)

    category_tokens = _tokenize(opportunity.cause_category or "")
    category_score = 1.0 if interest_tokens & category_tokens else 0.0

    proximity_score = 0.0
    if (
        preferences.location_lat is not None
        and preferences.location_lng is not None
        and opportunity.location_lat is not None
        and opportunity.location_lng is not None
    ):
        distance_km = haversine_km(preferences.location_lat, preferences.location_lng, opportunity.location_lat, opportunity.location_lng)
        radius = max(preferences.radius_km or 25, 1)
        proximity_score = max(0.0, 1.0 - (distance_km / max(radius, 1)))

    needed = opportunity.volunteers_needed or 0
    signed = opportunity.volunteers_signed or 0
    remaining = max(0, needed - signed)
    demand_score = remaining / max(needed, 1) if needed > 0 else 0.0

    recency_score = 0.0
    if opportunity.event_date is not None:
        days_until = (opportunity.event_date - date.today()).days
        if days_until >= 0:
            recency_score = max(0.0, 1.0 - (days_until / 45.0))

    final_score = (
        semantic_score * 0.36
        + interest_score * 0.22
        + skill_score * 0.16
        + category_score * 0.08
        + proximity_score * 0.10
        + demand_score * 0.05
        + recency_score * 0.03
    )
    bounded_score = max(0.0, min(1.0, final_score))
    reason = _build_reason(opportunity, interest_matches, skill_matches, proximity_score, demand_score)
    return bounded_score, reason


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right:
        return 0.0

    size = min(len(left), len(right))
    if size == 0:
        return 0.0

    a = left[:size]
    b = right[:size]
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def get_recommendations(
    db: AsyncSession,
    preferences: UserPreference,
    limit: int = 20,
) -> list[tuple[Opportunity, float, str]]:
    embedding = _coerce_embedding(preferences.embedding)
    if len(embedding) == 0:
        await update_user_embedding(db, preferences)
        embedding = _coerce_embedding(preferences.embedding)

<<<<<<< Updated upstream
    knn_limit = min(limit * 3, 100)
    dialect_name = db.get_bind().dialect.name

    if dialect_name == "postgresql":
        # Use pgvector's native <=> operator for fast KNN in production.
        vec_literal = "[" + ",".join(str(v) for v in embedding) + "]"
        stmt = (
            select(
                Opportunity,
                (1 - Opportunity.embedding.cosine_distance(text(f"'{vec_literal}'::vector"))).label("cosine_sim"),
            )
            .where(Opportunity.embedding.is_not(None))
            .order_by(Opportunity.embedding.cosine_distance(text(f"'{vec_literal}'::vector")))
            .limit(knn_limit)
        )
        result = await db.execute(stmt)
        candidates = [(row[0], float(row[1])) for row in result.all()]
    else:
        # SQLite/dev fallback: compute cosine similarity in Python.
        result = await db.execute(select(Opportunity).where(Opportunity.embedding.is_not(None)))
        opportunities = list(result.scalars().all())
        scored = [
            (opp, _cosine_similarity(embedding, _coerce_embedding(opp.embedding)))
            for opp in opportunities
        ]
        scored.sort(key=lambda item: item[1], reverse=True)
        candidates = scored[:knn_limit]
=======
    stmt = select(Opportunity)
    result = await db.execute(stmt)
    opportunities = list(result.scalars().all())
    if not opportunities:
        return []
>>>>>>> Stashed changes

    await _ensure_opportunity_embeddings(db, opportunities)

    scored = [
        (opp, *(_score_opportunity(opp, preferences, embedding)))
        for opp in opportunities
    ]
    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[:limit]
