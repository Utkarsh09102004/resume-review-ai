import base64
import hashlib
import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from fastmcp import Client
from fastmcp.client.transports.http import StreamableHttpTransport
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app import database
from app.core.auth import AuthError
from app.main import create_app
from app.models.resume import Resume

_INITIALIZE_PAYLOAD = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2025-03-26",
        "capabilities": {},
        "clientInfo": {"name": "test-client", "version": "1.0"},
    },
}
_MCP_HEADERS = {"accept": "application/json, text/event-stream"}


def _build_mcp_client(test_app, app_url: str, *, auth: str | None = None) -> Client:
    def factory(
        *,
        headers: dict[str, str] | None = None,
        timeout: httpx.Timeout | None = None,
        auth: httpx.Auth | None = None,
        **_: object,
    ) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            transport=ASGITransport(app=test_app),
            base_url="http://test",
            headers=headers,
            auth=auth,
            timeout=timeout,
            follow_redirects=False,
        )

    transport = StreamableHttpTransport(
        url=app_url,
        auth=auth,
        httpx_client_factory=factory,
    )
    return Client(transport)


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", True)
async def test_mcp_mount_rejects_missing_bearer_token() -> None:
    test_app = create_app()
    transport = ASGITransport(app=test_app)

    async with test_app.router.lifespan_context(test_app):
        async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=False) as client:
            response = await client.post("/mcp", headers=_MCP_HEADERS, json=_INITIALIZE_PAYLOAD)

    assert response.status_code == 401
    assert response.json() == {"detail": "Missing authorization header"}


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", True)
@patch("app.mcp.auth_middleware.validate_token", new_callable=AsyncMock, side_effect=AuthError("Invalid token"))
async def test_mcp_mount_rejects_invalid_bearer_token(_mock_validate: AsyncMock) -> None:
    test_app = create_app()
    transport = ASGITransport(app=test_app)

    async with test_app.router.lifespan_context(test_app):
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            follow_redirects=False,
            headers={"authorization": "Bearer invalid-token", **_MCP_HEADERS},
        ) as client:
            response = await client.post("/mcp", json=_INITIALIZE_PAYLOAD)

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid token"}


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", True)
@patch("app.mcp.auth_middleware.validate_token", new_callable=AsyncMock, return_value="mounted-user")
async def test_mcp_mount_executes_real_tool_with_valid_token(
    _mock_validate: AsyncMock,
    monkeypatch: pytest.MonkeyPatch,
    test_engine,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="mounted-user",
                title="Mounted Resume",
                latex_source="source",
                updated_at=datetime(2026, 4, 1, tzinfo=UTC),
            )
        )
        await session.commit()

    monkeypatch.setattr(database, "session_factory", session_factory)
    test_app = create_app()

    async with test_app.router.lifespan_context(test_app):
        async with _build_mcp_client(test_app, "http://test/mcp", auth="valid-token") as client:
            result = await client.call_tool("list_user_resumes")

    assert str(resume_id) in str(result)
    assert "Mounted Resume" in str(result)


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", False)
async def test_mcp_mount_dev_mode_exposes_oauth_metadata_under_mount() -> None:
    test_app = create_app()
    transport = ASGITransport(app=test_app)

    async with test_app.router.lifespan_context(test_app):
        async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=False) as client:
            auth_server = await client.get("/mcp/.well-known/oauth-authorization-server")
            protected_resource = await client.get("/mcp/.well-known/oauth-protected-resource/mcp")

    assert auth_server.status_code == 200
    assert auth_server.json()["issuer"] == "http://localhost:8000/mcp"

    assert protected_resource.status_code == 200
    assert protected_resource.json()["resource"] == "http://localhost:8000/mcp"


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", False)
async def test_mcp_mount_dev_oauth_token_can_call_resume_tools(
    monkeypatch: pytest.MonkeyPatch,
    test_engine,
    tmp_path,
) -> None:
    clients_file = tmp_path / "mcp-dev-clients.json"
    monkeypatch.setattr("app.mcp.server._DEFAULT_DEV_OAUTH_CLIENTS_FILE", clients_file)

    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="dev-user",
                title="Dev Resume",
                latex_source="source",
                updated_at=datetime(2026, 4, 1, tzinfo=UTC),
            )
        )
        await session.commit()

    monkeypatch.setattr(database, "session_factory", session_factory)
    test_app = create_app()
    transport = ASGITransport(app=test_app)
    code_verifier = "plain-verifier"
    code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).decode().rstrip("=")

    async with test_app.router.lifespan_context(test_app):
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
            access_token = token.json()["access_token"]

        async with _build_mcp_client(test_app, "http://test/mcp", auth=access_token) as client:
            list_result = await client.call_tool("list_user_resumes")
            read_result = await client.call_tool("read_resume", {"resume_id": str(resume_id)})

    assert str(resume_id) in str(list_result)
    assert "Dev Resume" in str(list_result)
    assert "1\\tsource" in str(read_result)


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", True)
@patch("app.mcp.auth_middleware.validate_token", new_callable=AsyncMock, return_value="mounted-user")
async def test_mcp_mount_supports_both_path_shapes_without_redirect(
    _mock_validate: AsyncMock,
) -> None:
    test_app = create_app()
    transport = ASGITransport(app=test_app)

    async with test_app.router.lifespan_context(test_app):
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            follow_redirects=False,
            headers={"authorization": "Bearer valid-token", **_MCP_HEADERS},
        ) as client:
            root_response = await client.post("/mcp", json=_INITIALIZE_PAYLOAD)
            slash_response = await client.post("/mcp/", json=_INITIALIZE_PAYLOAD)

    assert root_response.status_code == 200
    assert slash_response.status_code == 200
    assert root_response.headers.get("location") is None
    assert slash_response.headers.get("location") is None
