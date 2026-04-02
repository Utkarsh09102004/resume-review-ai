import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

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
async def test_mcp_mount_dev_mode_resolves_to_dev_user(
    monkeypatch: pytest.MonkeyPatch,
    test_engine,
) -> None:
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

    async with test_app.router.lifespan_context(test_app):
        async with _build_mcp_client(test_app, "http://test/mcp") as client:
            result = await client.call_tool("list_user_resumes")

    assert str(resume_id) in str(result)
    assert "Dev Resume" in str(result)


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
