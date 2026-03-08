from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.auth_credential import UserCredential
from app.models.user import User, UserPreference
from app.schemas.user import UserPreferencesRead, UserRead
from app.security import create_local_access_token, hash_password, verify_password

router = APIRouter()


class AuthExchangeRequest(BaseModel):
    auth0_id: str
    email: str
    full_name: str | None = None
    role: str = "student"


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    role: str = "student"


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str | None = None
    token_type: str | None = None
    requires_email_verification: bool = False
    user: UserRead


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


def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def _upsert_local_user(
    *,
    db: AsyncSession,
    provider_user_id: str,
    email: str,
    full_name: str | None,
    role: str,
) -> User:
    result = await db.execute(select(User).where(User.auth0_id == provider_user_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            auth0_id=provider_user_id,
            email=email,
            full_name=full_name,
            role=role,
        )
        db.add(user)
    else:
        user.email = email
        user.full_name = full_name
        user.role = role

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    if payload.role not in {"student", "organization"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")

    email = _normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Email is required")
    if len(payload.password) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be at least 8 characters")

    existing = await db.execute(select(User).where(func.lower(User.email) == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    full_name = payload.full_name or email.split("@")[0]
    user = User(
        auth0_id=f"local:{email}",
        email=email,
        full_name=full_name,
        role=payload.role,
    )
    db.add(user)
    await db.flush()

    credential = UserCredential(user_id=user.id, password_hash=hash_password(payload.password))
    db.add(credential)

    await db.commit()
    await db.refresh(user)

    token = create_local_access_token(subject=user.auth0_id)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        requires_email_verification=False,
        user=await _build_user_read(db, user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    email = _normalize_email(payload.email)
    user_result = await db.execute(select(User).where(func.lower(User.email) == email))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login credentials")

    cred_result = await db.execute(select(UserCredential).where(UserCredential.user_id == user.id))
    credential = cred_result.scalar_one_or_none()
    if credential is None or not verify_password(payload.password, credential.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login credentials")

    token = create_local_access_token(subject=user.auth0_id)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        requires_email_verification=False,
        user=await _build_user_read(db, user),
    )


@router.post("/exchange")
async def exchange_token(payload: AuthExchangeRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    if payload.role not in {"student", "organization"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")

    email = _normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Email is required")

    result = await db.execute(select(User).where(User.auth0_id == payload.auth0_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            auth0_id=payload.auth0_id,
            email=email,
            full_name=payload.full_name,
            role=payload.role,
        )
        db.add(user)
    else:
        user.email = email
        user.full_name = payload.full_name
        user.role = payload.role

    await db.commit()
    await db.refresh(user)

    token = create_local_access_token(subject=user.auth0_id)
    return {
        "id": user.id,
        "role": user.role,
        "access_token": token,
        "token_type": "bearer",
    }
