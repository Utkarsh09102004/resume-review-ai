import base64
import math
from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import patch

import httpx
import pytest
import respx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.core import auth as core_auth
from app.middleware import auth
from app.middleware.auth import get_current_user

# ---------------------------------------------------------------------------
# Test RSA key pair (generated once at module level)
# ---------------------------------------------------------------------------

_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_public_key = _private_key.public_key()

_private_pem: bytes = _private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)

_pub_numbers = _public_key.public_numbers()


def _int_to_base64url(n: int) -> str:
    byte_length = max(1, math.ceil(n.bit_length() / 8))
    n_bytes = n.to_bytes(byte_length, byteorder="big")
    return base64.urlsafe_b64encode(n_bytes).rstrip(b"=").decode("ascii")


TEST_KID = "test-kid-001"

_test_jwk: dict[str, str] = {
    "kty": "RSA",
    "kid": TEST_KID,
    "use": "sig",
    "alg": "RS256",
    "n": _int_to_base64url(_pub_numbers.n),
    "e": _int_to_base64url(_pub_numbers.e),
}

MOCK_JWKS_RESPONSE: dict[str, list[dict[str, str]]] = {"keys": [_test_jwk]}

# ---------------------------------------------------------------------------
# JWT builder helper
# ---------------------------------------------------------------------------


def _make_token(
    sub: str | None = "user-abc",
    kid: str = TEST_KID,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    headers: dict[str, str] = {"kid": kid, "alg": "RS256"}
    claims: dict[str, Any] = {}
    if sub is not None:
        claims["sub"] = sub
    if extra_claims:
        claims.update(extra_claims)
    return jwt.encode(claims, _private_pem.decode("utf-8"), algorithm="RS256", headers=headers)


# ---------------------------------------------------------------------------
# Autouse fixture: reset global JWKS cache between tests
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
async def _reset_jwks_cache() -> AsyncGenerator[None, None]:
    core_auth._jwks_cache = None
    core_auth._jwks_cache_time = 0
    yield
    core_auth._jwks_cache = None
    core_auth._jwks_cache_time = 0


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

JWKS_URL = "https://auth.example.com/.well-known/jwks.json"


@pytest.mark.asyncio
@patch.object(auth.settings, "AUTH_ENABLED", False)
async def test_dev_mode_returns_dev_user() -> None:
    result = await get_current_user(credentials=None)
    assert result == "dev-user"


@pytest.mark.asyncio
@patch.object(auth.settings, "AUTH_ENABLED", True)
async def test_missing_credentials_returns_401() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=None)
    assert exc_info.value.status_code == 401
    assert "Missing authorization header" in str(exc_info.value.detail)


@pytest.mark.asyncio
@respx.mock
@patch.object(auth.settings, "AUTH_ENABLED", True)
@patch.object(auth.settings, "LOGTO_JWKS_URL", JWKS_URL)
@patch.object(auth.settings, "LOGTO_APP_ID", "")
async def test_invalid_jwt_returns_401() -> None:
    respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=MOCK_JWKS_RESPONSE))
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="not-a-real-jwt")
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=creds)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
@respx.mock
@patch.object(auth.settings, "AUTH_ENABLED", True)
@patch.object(auth.settings, "LOGTO_JWKS_URL", JWKS_URL)
@patch.object(auth.settings, "LOGTO_APP_ID", "")
async def test_valid_jwt_returns_sub_claim() -> None:
    respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=MOCK_JWKS_RESPONSE))
    token = _make_token(sub="user-42")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    result = await get_current_user(credentials=creds)
    assert result == "user-42"


@pytest.mark.asyncio
@respx.mock
@patch.object(auth.settings, "AUTH_ENABLED", True)
@patch.object(auth.settings, "LOGTO_JWKS_URL", JWKS_URL)
@patch.object(auth.settings, "LOGTO_APP_ID", "")
async def test_jwks_cache_refresh_on_kid_mismatch() -> None:
    old_jwk = {**_test_jwk, "kid": "old-kid-000"}
    stale_jwks: dict[str, list[dict[str, str]]] = {"keys": [old_jwk]}
    route = respx.get(JWKS_URL)
    route.side_effect = [
        httpx.Response(200, json=stale_jwks),
        httpx.Response(200, json=MOCK_JWKS_RESPONSE),
    ]

    token = _make_token(sub="refreshed-user")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    result = await get_current_user(credentials=creds)
    assert result == "refreshed-user"
    assert route.call_count == 2


@pytest.mark.asyncio
@respx.mock
@patch.object(auth.settings, "AUTH_ENABLED", True)
@patch.object(auth.settings, "LOGTO_JWKS_URL", JWKS_URL)
@patch.object(auth.settings, "LOGTO_APP_ID", "")
async def test_jwt_missing_sub_claim_returns_401() -> None:
    respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=MOCK_JWKS_RESPONSE))
    token = _make_token(sub=None)
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=creds)
    assert exc_info.value.status_code == 401
    assert "sub" in str(exc_info.value.detail).lower()
