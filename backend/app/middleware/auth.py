import asyncio
import logging
import time
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

_jwks_cache: dict[str, Any] | None = None
_jwks_cache_time: float = 0
_JWKS_CACHE_TTL: int = 3600  # 1 hour
_jwks_lock: asyncio.Lock = asyncio.Lock()


async def _get_jwks(force_refresh: bool = False) -> dict[str, Any]:
    global _jwks_cache, _jwks_cache_time
    now = time.time()

    # Fast path: cache is valid, no refresh forced
    if not force_refresh and _jwks_cache is not None and (now - _jwks_cache_time) <= _JWKS_CACHE_TTL:
        return _jwks_cache

    # Slow path: acquire lock, re-check, then fetch
    async with _jwks_lock:
        now = time.time()
        if not force_refresh and _jwks_cache is not None and (now - _jwks_cache_time) <= _JWKS_CACHE_TTL:
            return _jwks_cache

        async with httpx.AsyncClient() as client:
            resp = await client.get(settings.LOGTO_JWKS_URL)
            resp.raise_for_status()
            fetched: dict[str, Any] = resp.json()
            _jwks_cache = fetched
            _jwks_cache_time = time.time()
            return fetched


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if not settings.AUTH_ENABLED:
        return "dev-user"

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    token = credentials.credentials
    try:
        jwks = await _get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        key = None
        for k in jwks.get("keys", []):
            if k.get("kid") == unverified_header.get("kid"):
                key = k
                break

        # If kid not found, try refreshing JWKS (key rotation)
        if key is None:
            jwks = await _get_jwks(force_refresh=True)
            for k in jwks.get("keys", []):
                if k.get("kid") == unverified_header.get("kid"):
                    key = k
                    break

        if key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate key",
            )

        decode_options: dict[str, bool] = {"verify_aud": False}
        if settings.LOGTO_APP_ID:
            decode_options = {"verify_aud": True}
        else:
            logger.warning("LOGTO_APP_ID is empty — JWT audience verification is disabled")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.LOGTO_APP_ID if settings.LOGTO_APP_ID else None,
            options=decode_options,
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing sub claim",
            )
        return user_id
    except JWTError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from err
