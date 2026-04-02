from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import dispose_engine
from app.mcp.server import create_mcp_http_app
from app.middleware.mcp_path import NormalizeMountedMCPPathMiddleware
from app.routes import compile, resumes


def create_app() -> FastAPI:
    mcp_http_app = create_mcp_http_app()

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        try:
            async with mcp_http_app.lifespan(_app):
                yield
        finally:
            await dispose_engine()

    app = FastAPI(title="ResumeForge API", lifespan=lifespan)
    app.add_middleware(NormalizeMountedMCPPathMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(resumes.router)
    app.include_router(compile.router)
    app.mount("/mcp", mcp_http_app)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
