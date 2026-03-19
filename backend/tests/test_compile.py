import httpx
import pytest
import respx
from httpx import AsyncClient

from app.config import settings

TEXLIVE_COMPILE_URL = f"{settings.TEXLIVE_URL}/compile"


@pytest.mark.asyncio
@respx.mock
async def test_compile_success(client: AsyncClient) -> None:
    pdf_bytes = b"%PDF-1.4 fake pdf content"
    respx.post(TEXLIVE_COMPILE_URL).mock(
        return_value=httpx.Response(
            200,
            content=pdf_bytes,
            headers={"content-type": "application/pdf"},
        )
    )

    resp = await client.post("/api/compile", json={"latex": r"\documentclass{article}\begin{document}Hi\end{document}"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content == pdf_bytes


@pytest.mark.asyncio
@respx.mock
async def test_compile_latex_error(client: AsyncClient) -> None:
    error_body = {"success": False, "message": "error", "log": "! Undefined control sequence."}
    respx.post(TEXLIVE_COMPILE_URL).mock(
        return_value=httpx.Response(
            400,
            json=error_body,
        )
    )

    resp = await client.post("/api/compile", json={"latex": r"\badcommand"})
    assert resp.status_code == 400
    data = resp.json()
    assert data["detail"]["success"] is False


@pytest.mark.asyncio
@respx.mock
async def test_compile_service_unavailable(client: AsyncClient) -> None:
    respx.post(TEXLIVE_COMPILE_URL).mock(side_effect=httpx.ConnectError("Connection refused"))

    resp = await client.post("/api/compile", json={"latex": r"\documentclass{article}\begin{document}Hi\end{document}"})
    assert resp.status_code == 503
    assert "unavailable" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_compile_payload_too_large(client: AsyncClient) -> None:
    huge_latex = "x" * 500_001
    resp = await client.post("/api/compile", json={"latex": huge_latex})
    assert resp.status_code == 422
