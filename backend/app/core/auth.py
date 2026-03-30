import asyncio
import logging
import time
from typing import Any, cast

import httpx
from jose import JWTError, jwt

from app.config import settings

logger = logging.getLogger(__name__)

_jwks_cache: dict[str, Any] | None = None
_jwks_cache_time: float = 0
_JWKS_CACHE_TTL: int = 3600
_jwks_lock: asyncio.Lock = asyncio.Lock()


class AuthError(Exception):
    def __init__(self, detail: str, status_code: int = 401) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


async def _get_jwks(force_refresh: bool = False) -> dict[str, Any]:
    global _jwks_cache, _jwks_cache_time
    now = time.time()

    if not force_refresh and _jwks_cache is not None and (now - _jwks_cache_time) <= _JWKS_CACHE_TTL:
        return _jwks_cache

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


async def validate_token(token: str) -> str:
    try:
        jwks = await _get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        key = next(
            (candidate for candidate in jwks.get("keys", []) if candidate.get("kid") == unverified_header.get("kid")),
            None,
        )

        if key is None:
            jwks = await _get_jwks(force_refresh=True)
            key = next(
                (
                    candidate
                    for candidate in jwks.get("keys", [])
                    if candidate.get("kid") == unverified_header.get("kid")
                ),
                None,
            )

        if key is None:
            raise AuthError("Unable to find appropriate key")

        decode_options: dict[str, bool] = {"verify_aud": False}
        audience: str | None = None
        if settings.LOGTO_APP_ID:
            decode_options = {"verify_aud": True}
            audience = settings.LOGTO_APP_ID
        else:
            logger.warning("LOGTO_APP_ID is empty — JWT audience verification is disabled")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=audience,
            options=decode_options,
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise AuthError("Token missing sub claim")
        return cast(str, user_id)
    except AuthError:
        raise
    except JWTError as err:
        raise AuthError("Invalid token") from err
