from collections.abc import Awaitable, Callable
from typing import Any

from starlette.types import Receive, Scope, Send


class NormalizeMountedMCPPathMiddleware:
    def __init__(self, app: Callable[[Scope, Receive, Send], Awaitable[None]]) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"] == "/mcp":
            rewritten_scope: dict[str, Any] = dict(scope)
            rewritten_scope["path"] = "/mcp/"
            rewritten_scope["raw_path"] = b"/mcp/"
            await self.app(rewritten_scope, receive, send)
            return

        await self.app(scope, receive, send)
