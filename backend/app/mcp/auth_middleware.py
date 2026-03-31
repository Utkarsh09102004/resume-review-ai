from typing import Any

from fastmcp.server.dependencies import get_http_headers
from fastmcp.server.middleware import Middleware, MiddlewareContext
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings
from app.core.auth import AuthError, validate_token


def _extract_bearer_token(authorization_header: str | None) -> str:
    if authorization_header is None:
        raise AuthError("Missing authorization header")

    scheme, _, token = authorization_header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise AuthError("Invalid authorization header")

    return token.strip()


async def authenticate_bearer_token(authorization_header: str | None) -> str:
    if not settings.AUTH_ENABLED:
        return "dev-user"

    token = _extract_bearer_token(authorization_header)
    return await validate_token(token)


class LogtoAuthMiddleware(Middleware):
    async def on_request(
        self,
        context: MiddlewareContext[Any],
        call_next: Any,
    ) -> Any:
        headers = get_http_headers(include={"authorization"})
        user_id = await authenticate_bearer_token(headers.get("authorization"))

        if context.fastmcp_context is not None:
            await context.fastmcp_context.set_state("user_id", user_id)

        return await call_next(context)


class BearerAuthHTTPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        try:
            await authenticate_bearer_token(request.headers.get("authorization"))
        except AuthError as err:
            return JSONResponse(
                {"detail": err.detail},
                status_code=err.status_code,
            )

        return await call_next(request)
