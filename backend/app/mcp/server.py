import json
import os
import tempfile
from pathlib import Path

from fastmcp import FastMCP
from fastmcp.server.auth.providers.in_memory import InMemoryOAuthProvider
from fastmcp.server.http import StarletteWithLifespan
from mcp.server.auth.settings import ClientRegistrationOptions
from mcp.shared.auth import OAuthClientInformationFull
from pydantic import AnyHttpUrl
from starlette.middleware import Middleware as ASGIMiddleware

from app.config import settings
from app.mcp.auth_middleware import BearerAuthHTTPMiddleware, DevUserMiddleware, LogtoAuthMiddleware
from app.mcp.tools import register_tools

_DEFAULT_DEV_OAUTH_CLIENTS_FILE = (
    Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "resumeforge" / "mcp-dev-oauth-clients.json"
)


class CanonicalOAuthProvider(InMemoryOAuthProvider):
    def __init__(
        self,
        *args: object,
        clients_file: Path | None = None,
        **kwargs: object,
    ) -> None:
        super().__init__(*args, **kwargs)
        self._clients_file = clients_file or _DEFAULT_DEV_OAUTH_CLIENTS_FILE
        self.clients = self._load_clients()

    def _get_resource_url(self, path: str | None = None) -> AnyHttpUrl | None:
        if self.base_url is None:
            return None

        if path in {None, "", "/"}:
            return AnyHttpUrl(str(self.base_url).rstrip("/"))

        return super()._get_resource_url(path)

    def _load_clients(self) -> dict[str, OAuthClientInformationFull]:
        if not self._clients_file.exists():
            return {}

        try:
            raw_clients = json.loads(self._clients_file.read_text())
        except (OSError, json.JSONDecodeError):
            return {}

        clients: dict[str, OAuthClientInformationFull] = {}
        if not isinstance(raw_clients, list):
            return clients

        for raw_client in raw_clients:
            try:
                client = OAuthClientInformationFull.model_validate(raw_client)
            except Exception:
                continue

            client_id = getattr(client, "client_id", None)
            if isinstance(client_id, str) and client_id:
                clients[client_id] = client

        return clients

    def _persist_clients(self) -> None:
        self._clients_file.parent.mkdir(parents=True, exist_ok=True)
        payload = [
            client.model_dump(mode="json", exclude_none=True)
            for client in self.clients.values()
            if isinstance(client.client_id, str) and client.client_id
        ]
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=self._clients_file.parent,
            prefix=f"{self._clients_file.stem}.",
            suffix=".tmp",
            delete=False,
        ) as temp_file:
            temp_file.write(json.dumps(payload, indent=2, sort_keys=True))
            temp_path = Path(temp_file.name)

        temp_path.replace(self._clients_file)

    async def get_client(self, client_id: str) -> OAuthClientInformationFull | None:
        client = await super().get_client(client_id)
        if client is not None:
            return client

        self.clients = self._load_clients()
        return await super().get_client(client_id)

    async def register_client(self, client_info: OAuthClientInformationFull) -> None:
        await super().register_client(client_info)
        try:
            self._persist_clients()
        except OSError:
            pass


def create_mcp_server() -> FastMCP:
    if settings.AUTH_ENABLED:
        # Production: verify Logto JWTs at the MCP protocol level
        auth = None
        middleware = [LogtoAuthMiddleware()]
    else:
        # Dev: built-in OAuth provider so MCP SDK discovery works
        auth = CanonicalOAuthProvider(
            base_url=settings.MCP_BASE_URL,
            client_registration_options=ClientRegistrationOptions(enabled=True),
        )
        middleware = [DevUserMiddleware()]

    mcp = FastMCP(
        name="ResumeForge MCP",
        instructions="AI-powered LaTeX resume editing tools for authenticated ResumeForge users.",
        auth=auth,
        middleware=middleware,
    )
    register_tools(mcp)
    return mcp


def create_mcp_http_app() -> StarletteWithLifespan:
    if settings.AUTH_ENABLED:
        asgi_mw = [ASGIMiddleware(BearerAuthHTTPMiddleware)]
    else:
        asgi_mw = None  # OAuthProvider adds its own middleware

    return create_mcp_server().http_app(
        path="/",
        transport="streamable-http",
        middleware=asgi_mw,
    )
