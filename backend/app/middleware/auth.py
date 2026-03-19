import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

security = HTTPBearer(auto_error=False)

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
_JWKS_CACHE_TTL: int = 3600  # 1 hour


async def _get_jwks(force_refresh: bool = False) -> dict:
    global _jwks_cache, _jwks_cache_time
    now = time.time()
    if _jwks_cache is None or force_refresh or (now - _jwks_cache_time) > _JWKS_CACHE_TTL:
        async with httpx.AsyncClient() as client:
            resp = await client.get(settings.LOGTO_JWKS_URL)
            resp.raise_for_status()
            _jwks_cache = resp.json()
            _jwks_cache_time = now
    return _jwks_cache


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

        decode_options = {"verify_aud": False}
        if settings.LOGTO_APP_ID:
            decode_options = {"verify_aud": True}

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
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
