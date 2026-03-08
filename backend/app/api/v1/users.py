from __future__ import annotations

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserPreference
from app.schemas.user import UserCreateUpdate, UserPreferencesRead, UserPreferencesUpdate, UserRead
from app.services.recommendation import update_user_embedding

router = APIRouter()


async def _build_user_read(db: AsyncSession, user: User) -> UserRead:
    pref_result = await db.execute(select(UserPreference).where(UserPreference.user_id == user.id))
    preference = pref_result.scalar_one_or_none()
    preference_read = UserPreferencesRead.model_validate(preference) if preference is not None else None
    return UserRead(
        id=user.id,
        auth0_id=user.auth0_id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        role=user.role,
        created_at=user.created_at,
        updated_at=user.updated_at,
        preferences=preference_read,
    )


@router.post("/me", response_model=UserRead)
async def upsert_me(
    payload: UserCreateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
 ) -> UserRead:
    current_user.email = payload.email
    current_user.full_name = payload.full_name
    current_user.role = payload.role
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return await _build_user_read(db, current_user)


@router.get("/me", response_model=UserRead)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    return await _build_user_read(db, current_user)


@router.put("/me/preferences", response_model=UserRead)
async def update_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
 ) -> UserRead:
    pref_result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    preference = pref_result.scalar_one_or_none()
    if preference is None:
        preference = UserPreference(user_id=current_user.id)
        db.add(preference)
        await db.flush()

    preference.interests = payload.interests
    preference.skills = payload.skills
    preference.location_lat = payload.location_lat
    preference.location_lng = payload.location_lng
    preference.radius_km = payload.radius_km

    await update_user_embedding(db, preference)

    await db.refresh(current_user)
    return await _build_user_read(db, current_user)


@router.put("/me/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    from app.services.cloudinary import upload_image

    url = await upload_image(file, folder="summit/avatars")
    current_user.avatar_url = url
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return await _build_user_read(db, current_user)
