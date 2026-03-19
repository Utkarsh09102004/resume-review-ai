import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.config import settings
from app.middleware.auth import get_current_user

router = APIRouter(tags=["compile"])


class CompileRequest(BaseModel):
    latex: str = Field(..., max_length=500_000)


@router.post("/api/compile")
async def compile_latex(body: CompileRequest, _user_id: str = Depends(get_current_user)) -> Response:
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.TEXLIVE_URL}/compile",
                json={"latex": body.latex},
            )
    except httpx.RequestError as err:
        raise HTTPException(
            status_code=503,
            detail="LaTeX compilation service unavailable",
        ) from err

    if resp.status_code == 200 and "application/pdf" in resp.headers.get("content-type", ""):
        return Response(
            content=resp.content,
            media_type="application/pdf",
        )

    try:
        error_body = resp.json()
    except Exception:
        error_body = {"detail": resp.text}

    raise HTTPException(status_code=resp.status_code, detail=error_body)
