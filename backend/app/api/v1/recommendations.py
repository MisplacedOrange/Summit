from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserPreference
from app.schemas.recommendation import RecommendationItem, RecommendationResponse
from app.services.recommendation import get_recommendations

router = APIRouter()


@router.get("", response_model=RecommendationResponse)
async def recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RecommendationResponse:
    pref_result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    preference = pref_result.scalar_one_or_none()
    if preference is None:
        preference = UserPreference(user_id=current_user.id, interests=[], skills=[])
        db.add(preference)
        await db.commit()

    if preference is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Preferences unavailable")

    scored = await get_recommendations(db, preference)
    items = [RecommendationItem(opportunity=opp, score=score) for opp, score in scored]
    return RecommendationResponse(items=items)
