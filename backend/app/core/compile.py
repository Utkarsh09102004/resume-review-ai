from typing import Any

import httpx

from app.config import settings


class CompileError(Exception):
    def __init__(self, status_code: int, detail: Any) -> None:
        super().__init__(str(detail))
        self.status_code = status_code
        self.detail = detail


class CompileServiceUnavailable(CompileError):
    def __init__(self) -> None:
        super().__init__(503, "LaTeX compilation service unavailable")


async def compile_latex(latex_source: str) -> bytes:
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.TEXLIVE_URL}/compile",
                json={"latex": latex_source},
            )
    except httpx.RequestError as err:
        raise CompileServiceUnavailable() from err

    if resp.status_code == 200 and "application/pdf" in resp.headers.get("content-type", ""):
        return resp.content

    try:
        error_body: Any = resp.json()
    except Exception:
        error_body = {"detail": resp.text}

    raise CompileError(resp.status_code, error_body)
