from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastmcp import FastMCP
from starlette.middleware import Middleware as ASGIMiddleware

from app.config import settings
from app.mcp import BearerAuthHTTPMiddleware, LogtoAuthMiddleware, dispose_engine


@asynccontextmanager
async def lifespan(_server: FastMCP) -> AsyncIterator[None]:
    yield
    await dispose_engine()


def create_mcp_server() -> FastMCP:
    return FastMCP(
        name="ResumeForge MCP",
        instructions="AI-powered LaTeX resume editing tools for authenticated ResumeForge users.",
        middleware=[LogtoAuthMiddleware()],
        lifespan=lifespan,
    )


server = create_mcp_server()


if __name__ == "__main__":
    server.run(
        transport="streamable-http",
        host=settings.MCP_HOST,
        port=settings.MCP_PORT,
        path="/mcp",
        middleware=[ASGIMiddleware(BearerAuthHTTPMiddleware)],
    )
