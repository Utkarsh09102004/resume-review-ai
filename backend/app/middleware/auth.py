import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

security = HTTPBearer(auto_error=False)

_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(settings.LOGTO_JWKS_URL)
            resp.raise_for_status()
            _jwks_cache = resp.json()
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
        if key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate key",
            )
        payload = jwt.decode(
            token,
            key,
            algorithms=[unverified_header.get("alg", "RS256")],
            options={"verify_aud": False},
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
