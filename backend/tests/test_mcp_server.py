from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastmcp.server.middleware import MiddlewareContext
from httpx import ASGITransport, AsyncClient
from starlette.applications import Starlette
from starlette.middleware import Middleware as ASGIMiddleware
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.core.auth import AuthError
from app.mcp.auth_middleware import BearerAuthHTTPMiddleware, LogtoAuthMiddleware


class _FakeFastMCPContext:
    def __init__(self) -> None:
        self.state: dict[str, Any] = {}

    async def set_state(self, key: str, value: Any, *, serializable: bool = True) -> None:
        assert serializable is True
        self.state[key] = value


async def _ok_endpoint(_request) -> JSONResponse:
    return JSONResponse({"ok": True})


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", True)
async def test_http_middleware_rejects_missing_bearer_token() -> None:
    app = Starlette(
        routes=[Route("/mcp", _ok_endpoint, methods=["POST"])],
        middleware=[ASGIMiddleware(BearerAuthHTTPMiddleware)],
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/mcp")

    assert response.status_code == 401
    assert response.json() == {"detail": "Missing authorization header"}


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", False)
async def test_http_middleware_allows_dev_mode_requests() -> None:
    app = Starlette(
        routes=[Route("/mcp", _ok_endpoint, methods=["POST"])],
        middleware=[ASGIMiddleware(BearerAuthHTTPMiddleware)],
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/mcp")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", True)
@patch("app.mcp.auth_middleware.validate_token", new_callable=AsyncMock, side_effect=AuthError("Invalid token"))
async def test_http_middleware_rejects_invalid_bearer_token(_mock_validate: AsyncMock) -> None:
    app = Starlette(
        routes=[Route("/mcp", _ok_endpoint, methods=["POST"])],
        middleware=[ASGIMiddleware(BearerAuthHTTPMiddleware)],
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": "Bearer invalid-token"},
    ) as client:
        response = await client.post("/mcp")

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid token"}


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", True)
@patch("app.mcp.auth_middleware.validate_token", new_callable=AsyncMock, return_value="user-123")
@patch("app.mcp.auth_middleware.get_http_headers", return_value={"authorization": "Bearer valid-token"})
async def test_fastmcp_middleware_sets_user_id_state(
    _mock_headers: Any,
    _mock_validate: AsyncMock,
) -> None:
    fastmcp_context = _FakeFastMCPContext()
    middleware = LogtoAuthMiddleware()
    call_next = AsyncMock(return_value={"ok": True})
    context = MiddlewareContext(
        message={"jsonrpc": "2.0", "method": "initialize"},
        fastmcp_context=fastmcp_context,
        method="initialize",
        type="request",
    )

    result = await middleware.on_request(context, call_next)

    assert result == {"ok": True}
    assert fastmcp_context.state == {"user_id": "user-123"}
    call_next.assert_awaited_once_with(context)
