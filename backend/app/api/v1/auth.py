from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User

router = APIRouter()


class AuthExchangeRequest(BaseModel):
    auth0_id: str
    email: str
    full_name: str | None = None
    role: str = "student"


@router.post("/exchange")
async def exchange_token(payload: AuthExchangeRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    if payload.role not in {"student", "organization"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")

    result = await db.execute(select(User).where(User.auth0_id == payload.auth0_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            auth0_id=payload.auth0_id,
            email=payload.email,
            full_name=payload.full_name,
            role=payload.role,
        )
        db.add(user)
    else:
        user.email = payload.email
        user.full_name = payload.full_name
        user.role = payload.role

    await db.commit()
    await db.refresh(user)

    return {"id": user.id, "role": user.role}
