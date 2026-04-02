from fastmcp import FastMCP
from fastmcp.server.http import StarletteWithLifespan
from starlette.middleware import Middleware as ASGIMiddleware

from app.mcp.auth_middleware import BearerAuthHTTPMiddleware, LogtoAuthMiddleware
from app.mcp.tools import register_tools


def create_mcp_server() -> FastMCP:
    mcp = FastMCP(
        name="ResumeForge MCP",
        instructions="AI-powered LaTeX resume editing tools for authenticated ResumeForge users.",
        middleware=[LogtoAuthMiddleware()],
    )
    register_tools(mcp)
    return mcp


def create_mcp_http_app() -> StarletteWithLifespan:
    return create_mcp_server().http_app(
        path="/",
        transport="streamable-http",
        middleware=[ASGIMiddleware(BearerAuthHTTPMiddleware)],
    )
