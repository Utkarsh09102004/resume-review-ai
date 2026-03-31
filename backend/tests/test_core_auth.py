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
from jose import jwt

from app.core import auth as core_auth

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
JWKS_URL = "https://auth.example.com/.well-known/jwks.json"


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


@pytest.fixture(autouse=True)
async def reset_jwks_cache() -> AsyncGenerator[None, None]:
    core_auth._jwks_cache = None
    core_auth._jwks_cache_time = 0
    yield
    core_auth._jwks_cache = None
    core_auth._jwks_cache_time = 0


@pytest.mark.asyncio
@respx.mock
@patch.object(core_auth.settings, "LOGTO_JWKS_URL", JWKS_URL)
@patch.object(core_auth.settings, "LOGTO_APP_ID", "")
async def test_validate_token_returns_sub() -> None:
    respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=MOCK_JWKS_RESPONSE))

    assert await core_auth.validate_token(_make_token(sub="user-42")) == "user-42"


@pytest.mark.asyncio
@respx.mock
@patch.object(core_auth.settings, "LOGTO_JWKS_URL", JWKS_URL)
@patch.object(core_auth.settings, "LOGTO_APP_ID", "")
async def test_validate_token_invalid_jwt_raises_auth_error() -> None:
    respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=MOCK_JWKS_RESPONSE))

    with pytest.raises(core_auth.AuthError, match="Invalid token"):
        await core_auth.validate_token("not-a-real-jwt")


@pytest.mark.asyncio
@respx.mock
@patch.object(core_auth.settings, "LOGTO_JWKS_URL", JWKS_URL)
@patch.object(core_auth.settings, "LOGTO_APP_ID", "")
async def test_validate_token_missing_sub_raises_auth_error() -> None:
    respx.get(JWKS_URL).mock(return_value=httpx.Response(200, json=MOCK_JWKS_RESPONSE))

    with pytest.raises(core_auth.AuthError, match="Token missing sub claim"):
        await core_auth.validate_token(_make_token(sub=None))


@pytest.mark.asyncio
@respx.mock
@patch.object(core_auth.settings, "LOGTO_JWKS_URL", JWKS_URL)
@patch.object(core_auth.settings, "LOGTO_APP_ID", "")
async def test_validate_token_kid_refresh() -> None:
    stale_jwks = {"keys": [{**_test_jwk, "kid": "old-kid"}]}
    route = respx.get(JWKS_URL)
    route.side_effect = [
        httpx.Response(200, json=stale_jwks),
        httpx.Response(200, json=MOCK_JWKS_RESPONSE),
    ]

    assert await core_auth.validate_token(_make_token(sub="refreshed-user")) == "refreshed-user"
    assert route.call_count == 2


@pytest.mark.asyncio
@respx.mock
@patch.object(core_auth.settings, "LOGTO_JWKS_URL", JWKS_URL)
@patch.object(core_auth.settings, "LOGTO_APP_ID", "")
async def test_validate_token_unknown_kid_raises_auth_error() -> None:
    route = respx.get(JWKS_URL)
    route.side_effect = [
        httpx.Response(200, json=MOCK_JWKS_RESPONSE),
        httpx.Response(200, json=MOCK_JWKS_RESPONSE),
    ]

    with pytest.raises(core_auth.AuthError, match="Unable to find appropriate key"):
        await core_auth.validate_token(_make_token(kid="missing-kid"))

    assert route.call_count == 2
