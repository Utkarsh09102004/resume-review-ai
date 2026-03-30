from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core.compile import (
    CompileError,
    CompileServiceUnavailable,
)
from app.core.compile import (
    compile_latex as compile_latex_pdf,
)
from app.middleware.auth import get_current_user

router = APIRouter(tags=["compile"])


class CompileRequest(BaseModel):
    latex: str = Field(..., max_length=500_000)


@router.post("/api/compile")
async def compile_latex(body: CompileRequest, _user_id: str = Depends(get_current_user)) -> Response:
    try:
        pdf_bytes = await compile_latex_pdf(body.latex)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
        )
    except CompileServiceUnavailable as err:
        raise HTTPException(status_code=err.status_code, detail=err.detail) from err
    except CompileError as err:
        raise HTTPException(status_code=err.status_code, detail=err.detail) from err
