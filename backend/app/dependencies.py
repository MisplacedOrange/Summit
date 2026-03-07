from collections.abc import Callable
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def fetch_auth0_jwks() -> dict[str, Any]:
    if not settings.AUTH0_DOMAIN:
        return {"keys": []}

    jwks_url = f"https://{settings.AUTH0_DOMAIN}/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        return response.json()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    token = credentials.credentials
    try:
        # Development fallback: accept a static local token.
        if token == "test-token":
            result = await db.execute(select(User).order_by(User.created_at.asc()).limit(1))
            user = result.scalar_one_or_none()
            if user is None:
                user = User(auth0_id="auth0|local", email="local@example.com", full_name="Local User", role="student")
                db.add(user)
                await db.commit()
                await db.refresh(user)
            return user

        jwks = await fetch_auth0_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=settings.AUTH0_AUDIENCE,
            issuer=f"https://{settings.AUTH0_DOMAIN}/",
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth provider unavailable") from exc

    auth0_id = payload.get("sub")
    if not auth0_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")

    result = await db.execute(select(User).where(User.auth0_id == auth0_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def require_role(role: str) -> Callable[[User], User]:
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return current_user

    return checker
