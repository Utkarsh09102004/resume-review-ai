import json
import uuid
from collections.abc import Sequence

from fastmcp import Context, FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import CurrentContext

from app.core.resume_ops import ResumeNotFoundError, get_resume, list_resumes
from app.mcp import get_session
from app.models.resume import Resume


def register_tools(mcp: FastMCP) -> None:
    @mcp.tool
    async def list_user_resumes(ctx: Context = CurrentContext()) -> str:
        user_id = await _require_user_id(ctx)

        async with get_session() as session:
            resumes = await list_resumes(session, user_id)

        return _format_resume_list(resumes)

    @mcp.tool
    async def read_resume(resume_id: str, ctx: Context = CurrentContext()) -> str:
        user_id = await _require_user_id(ctx)
        parsed_resume_id = _parse_uuid(resume_id)

        async with get_session() as session:
            try:
                resume = await get_resume(session, user_id, parsed_resume_id)
            except ResumeNotFoundError as err:
                raise ToolError(err.detail) from err

        return _format_latex_with_line_numbers(resume.latex_source)


async def _require_user_id(ctx: Context) -> str:
    user_id = await ctx.get_state("user_id")
    if not isinstance(user_id, str) or not user_id:
        raise ToolError("Authentication context missing user_id")
    return user_id


def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as err:
        raise ToolError("Invalid resume_id: expected a UUID string") from err


def _format_resume_list(resumes: Sequence[Resume]) -> str:
    if not resumes:
        return "No resumes found."

    return "\n".join(
        "- "
        f"{resume.id} | {json.dumps(resume.title, ensure_ascii=False)} | updated "
        f"{resume.updated_at.date().isoformat()}"
        for resume in resumes
    )


def _format_latex_with_line_numbers(latex_source: str) -> str:
    lines = latex_source.splitlines()
    if not lines:
        lines = [""]

    return "\n".join(f"{line_number}\t{line}" for line_number, line in enumerate(lines, start=1))
