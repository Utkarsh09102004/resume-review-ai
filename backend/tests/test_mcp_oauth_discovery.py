import base64
import hashlib
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", False)
async def test_mcp_oauth_well_known_routes_are_exposed_at_root() -> None:
    app = create_app()
    transport = ASGITransport(app=app)

    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            auth_server = await client.get("/.well-known/oauth-authorization-server")
            path_aware_auth_server = await client.get("/.well-known/oauth-authorization-server/mcp")
            protected_resource = await client.get("/.well-known/oauth-protected-resource/mcp")
            registration = await client.post("/mcp/register", json={})

    assert auth_server.status_code == 200
    assert auth_server.json()["issuer"] == "http://localhost:8000/mcp"
    assert auth_server.json()["registration_endpoint"] == "http://localhost:8000/mcp/register"

    assert path_aware_auth_server.status_code == 200
    assert path_aware_auth_server.json()["issuer"] == "http://localhost:8000/mcp"

    assert protected_resource.status_code == 200
    assert protected_resource.json()["resource"] == "http://localhost:8000/mcp"

    assert registration.status_code == 400
    assert registration.json()["error"] == "invalid_client_metadata"


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", False)
async def test_dev_oauth_registered_client_survives_new_app_instance(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    clients_file = tmp_path / "mcp-dev-clients.json"
    monkeypatch.setattr("app.mcp.server._DEFAULT_DEV_OAUTH_CLIENTS_FILE", clients_file)

    registration_payload = {
        "redirect_uris": ["http://127.0.0.1:8765/callback"],
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
    }

    first_app = create_app()
    first_transport = ASGITransport(app=first_app)

    async with first_app.router.lifespan_context(first_app):
        async with AsyncClient(transport=first_transport, base_url="http://test", follow_redirects=False) as client:
            registration = await client.post("/mcp/register", json=registration_payload)

    assert registration.status_code == 201
    client_id = registration.json()["client_id"]

    second_app = create_app()
    second_transport = ASGITransport(app=second_app)

    async with second_app.router.lifespan_context(second_app):
        async with AsyncClient(transport=second_transport, base_url="http://test", follow_redirects=False) as client:
            authorize = await client.get(
                "/mcp/authorize",
                params={
                    "client_id": client_id,
                    "redirect_uri": "http://127.0.0.1:8765/callback",
                    "response_type": "code",
                    "code_challenge": "test-challenge",
                    "code_challenge_method": "S256",
                    "state": "test-state",
                },
            )

    assert authorize.status_code in {302, 307}
    location = authorize.headers["location"]
    parsed_location = urlparse(location)
    query = parse_qs(parsed_location.query)
    assert (
        f"{parsed_location.scheme}://{parsed_location.netloc}{parsed_location.path}" == "http://127.0.0.1:8765/callback"
    )
    assert query["state"] == ["test-state"]
    assert "code" in query


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", False)
async def test_dev_oauth_can_exchange_token_and_initialize_mcp(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    clients_file = tmp_path / "mcp-dev-clients.json"
    monkeypatch.setattr("app.mcp.server._DEFAULT_DEV_OAUTH_CLIENTS_FILE", clients_file)

    code_verifier = "plain-verifier"
    code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).decode().rstrip("=")

    app = create_app()
    transport = ASGITransport(app=app)

    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=False) as client:
            registration = await client.post(
                "/mcp/register",
                json={
                    "redirect_uris": ["http://127.0.0.1:8765/callback"],
                    "grant_types": ["authorization_code", "refresh_token"],
                    "response_types": ["code"],
                    "token_endpoint_auth_method": "none",
                },
            )
            assert registration.status_code == 201
            client_id = registration.json()["client_id"]

            authorize = await client.get(
                "/mcp/authorize",
                params={
                    "client_id": client_id,
                    "redirect_uri": "http://127.0.0.1:8765/callback",
                    "response_type": "code",
                    "code_challenge": code_challenge,
                    "code_challenge_method": "S256",
                    "state": "oauth-state",
                },
            )
            assert authorize.status_code in {302, 307}
            code = parse_qs(urlparse(authorize.headers["location"]).query)["code"][0]

            token = await client.post(
                "/mcp/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": client_id,
                    "code": code,
                    "redirect_uri": "http://127.0.0.1:8765/callback",
                    "code_verifier": code_verifier,
                },
            )
            assert token.status_code == 200
            access_token = token.json()["access_token"]

            initialize = await client.post(
                "/mcp",
                headers={
                    "authorization": f"Bearer {access_token}",
                    "accept": "application/json, text/event-stream",
                },
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2025-03-26",
                        "capabilities": {},
                        "clientInfo": {"name": "test-client", "version": "1.0"},
                    },
                },
            )

    assert initialize.status_code == 200
