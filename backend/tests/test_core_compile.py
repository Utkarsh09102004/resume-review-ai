import httpx
import pytest
import respx

from app.config import settings
from app.core.compile import CompileError, CompileServiceUnavailable, compile_latex

TEXLIVE_COMPILE_URL = f"{settings.TEXLIVE_URL}/compile"


@pytest.mark.asyncio
@respx.mock
async def test_compile_success() -> None:
    pdf_bytes = b"%PDF-1.4 fake pdf content"
    respx.post(TEXLIVE_COMPILE_URL).mock(
        return_value=httpx.Response(
            200,
            content=pdf_bytes,
            headers={"content-type": "application/pdf"},
        )
    )

    result = await compile_latex(r"\documentclass{article}\begin{document}Hi\end{document}")
    assert result.pdf == pdf_bytes
    assert result.pages is None


@pytest.mark.asyncio
@respx.mock
async def test_compile_success_with_page_count() -> None:
    pdf_bytes = b"%PDF-1.4 fake pdf content"
    respx.post(TEXLIVE_COMPILE_URL).mock(
        return_value=httpx.Response(
            200,
            content=pdf_bytes,
            headers={"content-type": "application/pdf", "x-pdf-pages": "2"},
        )
    )

    result = await compile_latex(r"\documentclass{article}\begin{document}Hi\end{document}")
    assert result.pdf == pdf_bytes
    assert result.pages == 2


@pytest.mark.asyncio
@respx.mock
async def test_compile_error() -> None:
    error_body = {"success": False, "message": "error", "log": "! Undefined control sequence."}
    respx.post(TEXLIVE_COMPILE_URL).mock(return_value=httpx.Response(400, json=error_body))

    with pytest.raises(CompileError) as exc_info:
        await compile_latex(r"\badcommand")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == error_body


@pytest.mark.asyncio
@respx.mock
async def test_compile_service_unavailable() -> None:
    respx.post(TEXLIVE_COMPILE_URL).mock(side_effect=httpx.ConnectError("Connection refused"))

    with pytest.raises(CompileServiceUnavailable) as exc_info:
        await compile_latex(r"\documentclass{article}\begin{document}Hi\end{document}")

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "LaTeX compilation service unavailable"
