from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.routing import Route

from app.config import settings
from app.database import dispose_engine
from app.mcp.server import create_mcp_http_app
from app.middleware.mcp_path import NormalizeMountedMCPPathMiddleware
from app.routes import compile, resumes


def _alias_oauth_authorization_server_route(path: str, mount_path: str) -> str | None:
    if path != "/.well-known/oauth-authorization-server":
        return None

    normalized_mount_path = mount_path.strip("/")
    if not normalized_mount_path:
        return None

    return f"/.well-known/oauth-authorization-server/{normalized_mount_path}"


def _expose_mcp_well_known_routes(app: FastAPI, mcp_http_app: object, *, mount_path: str) -> None:
    existing_paths = {getattr(route, "path", None) for route in app.routes}

    for route in getattr(mcp_http_app, "routes", []):
        if not isinstance(route, Route) or not route.path.startswith("/.well-known/"):
            continue

        paths_to_add = [route.path]
        alias_path = _alias_oauth_authorization_server_route(route.path, mount_path)
        if alias_path is not None:
            paths_to_add.append(alias_path)

        for path in paths_to_add:
            if path in existing_paths:
                continue

            app.router.routes.append(
                Route(
                    path=path,
                    endpoint=route.endpoint,
                    methods=route.methods,
                    include_in_schema=False,
                    name=route.name,
                )
            )
            existing_paths.add(path)


def create_app() -> FastAPI:
    mcp_mount_path = "/mcp"
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
    _expose_mcp_well_known_routes(app, mcp_http_app, mount_path=mcp_mount_path)
    app.mount(mcp_mount_path, mcp_http_app)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
