from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
from typing import Any

from jose import JWTError, jwt

from app.config import settings

LOCAL_JWT_ISSUER = "impactmatch-local"
LOCAL_JWT_ALGORITHM = "HS256"
PASSWORD_HASH_ITERATIONS = 120_000


def create_local_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iss": LOCAL_JWT_ISSUER,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.APP_JWT_EXPIRE_HOURS)).timestamp()),
    }
    return jwt.encode(payload, settings.APP_JWT_SECRET, algorithm=LOCAL_JWT_ALGORITHM)


def decode_local_access_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.APP_JWT_SECRET, algorithms=[LOCAL_JWT_ALGORITHM])
    except JWTError:
        return None

    if payload.get("iss") != LOCAL_JWT_ISSUER:
        return None
    return payload


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS)
    salt_b64 = base64.b64encode(salt).decode("ascii")
    digest_b64 = base64.b64encode(digest).decode("ascii")
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt_b64}${digest_b64}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        scheme, iterations_raw, salt_b64, expected_b64 = password_hash.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        iterations = int(iterations_raw)
        salt = base64.b64decode(salt_b64.encode("ascii"))
        expected = base64.b64decode(expected_b64.encode("ascii"))
    except Exception:
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(actual, expected)
