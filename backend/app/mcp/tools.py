import json
import uuid
from collections.abc import Sequence

from fastmcp import Context, FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import CurrentContext

from app.core.resume_ops import ResumeNotFoundError, get_resume, list_resumes, update_resume_latex
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

    @mcp.tool
    async def search_replace(
        resume_id: str,
        search: str,
        replace: str,
        ctx: Context = CurrentContext(),
    ) -> str:
        user_id = await _require_user_id(ctx)
        parsed_resume_id = _parse_uuid(resume_id)
        _validate_search_text(search)

        async with get_session() as session:
            try:
                resume = await get_resume(session, user_id, parsed_resume_id)
            except ResumeNotFoundError as err:
                raise ToolError(err.detail) from err

            original_latex = resume.latex_source
            match_count = original_latex.count(search)
            if match_count == 0:
                raise ToolError("Text not found. Verify the exact text exists in the resume.")
            if match_count > 1:
                raise ToolError(
                    f"Found {match_count} matches. Provide more surrounding context for a unique match."
                )

            match_start = original_latex.find(search)
            updated_latex = original_latex.replace(search, replace, 1)
            await update_resume_latex(session, user_id, parsed_resume_id, updated_latex)

        return _format_search_replace_result(original_latex, updated_latex, match_start, search, replace)

    @mcp.tool
    async def insert_content(
        resume_id: str,
        after: str,
        content: str,
        ctx: Context = CurrentContext(),
    ) -> str:
        user_id = await _require_user_id(ctx)
        parsed_resume_id = _parse_uuid(resume_id)
        _validate_non_empty_text(after, "after")
        _validate_non_empty_text(content, "content")

        async with get_session() as session:
            try:
                resume = await get_resume(session, user_id, parsed_resume_id)
            except ResumeNotFoundError as err:
                raise ToolError(err.detail) from err

            original_latex = resume.latex_source
            match_start = _find_unique_match_start(
                original_latex,
                after,
                not_found_message="Anchor not found. Verify the exact anchor text exists in the resume.",
            )
            insert_at = match_start + len(after)
            updated_latex = original_latex[:insert_at] + "\n" + content + original_latex[insert_at:]
            await update_resume_latex(session, user_id, parsed_resume_id, updated_latex)

        return _format_insert_content_result(original_latex, updated_latex, match_start, after, content)

    @mcp.tool
    async def delete_content(
        resume_id: str,
        text: str,
        ctx: Context = CurrentContext(),
    ) -> str:
        user_id = await _require_user_id(ctx)
        parsed_resume_id = _parse_uuid(resume_id)
        _validate_non_empty_text(text, "text")

        async with get_session() as session:
            try:
                resume = await get_resume(session, user_id, parsed_resume_id)
            except ResumeNotFoundError as err:
                raise ToolError(err.detail) from err

            original_latex = resume.latex_source
            match_start = _find_unique_match_start(
                original_latex,
                text,
                not_found_message="Text not found. Verify the exact text exists in the resume.",
            )
            updated_latex = original_latex.replace(text, "", 1)
            await update_resume_latex(session, user_id, parsed_resume_id, updated_latex)

        return _format_delete_content_result(original_latex, updated_latex, match_start, text)


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


def _validate_search_text(search: str) -> None:
    _validate_non_empty_text(search, "search")


def _validate_non_empty_text(value: str, field_name: str) -> None:
    if not value:
        raise ToolError(f"Invalid {field_name}: must be a non-empty string")


def _find_unique_match_start(text: str, needle: str, *, not_found_message: str) -> int:
    match_count = text.count(needle)
    if match_count == 0:
        raise ToolError(not_found_message)
    if match_count > 1:
        raise ToolError(f"Found {match_count} matches. Provide more surrounding context for a unique match.")
    return text.find(needle)


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


def _format_search_replace_result(
    original_latex: str,
    updated_latex: str,
    match_start: int,
    search: str,
    replace: str,
) -> str:
    before_range, before_snippet = _format_context_with_line_numbers(
        original_latex,
        match_start,
        match_start + len(search),
    )
    after_range, after_snippet = _format_context_with_line_numbers(
        updated_latex,
        match_start,
        match_start + len(replace),
    )

    return (
        "Replaced 1 match.\n"
        f"Before ({before_range}):\n{before_snippet}\n"
        f"After ({after_range}):\n{after_snippet}"
    )


def _format_insert_content_result(
    original_latex: str,
    updated_latex: str,
    match_start: int,
    after: str,
    content: str,
) -> str:
    anchor_range, anchor_snippet = _format_context_with_line_numbers(
        original_latex,
        match_start,
        match_start + len(after),
    )
    insert_start = match_start + len(after) + 1
    inserted_range, inserted_snippet = _format_context_with_line_numbers(
        updated_latex,
        insert_start,
        insert_start + len(content),
    )

    return (
        "Inserted content after 1 match.\n"
        f"Anchor ({anchor_range}):\n{anchor_snippet}\n"
        f"After insertion ({inserted_range}):\n{inserted_snippet}"
    )


def _format_delete_content_result(
    original_latex: str,
    updated_latex: str,
    match_start: int,
    deleted_text: str,
) -> str:
    deleted_range, deleted_snippet = _format_context_with_line_numbers(
        original_latex,
        match_start,
        match_start + len(deleted_text),
    )
    after_range, after_snippet = _format_context_with_line_numbers(
        updated_latex,
        match_start,
        match_start,
    )

    return (
        "Deleted 1 match.\n"
        f"Removed ({deleted_range}):\n{deleted_snippet}\n"
        f"After deletion ({after_range}):\n{after_snippet}"
    )


def _format_context_with_line_numbers(
    text: str,
    start_index: int,
    end_index: int,
    context_lines: int = 1,
) -> tuple[str, str]:
    lines = text.splitlines()
    if not lines:
        lines = [""]

    total_lines = len(lines)
    start_line = _line_number_at_index(text, start_index)
    end_reference_index = start_index if end_index <= start_index else end_index - 1
    end_line = _line_number_at_index(text, end_reference_index)

    snippet_start_line = max(1, start_line - context_lines)
    snippet_end_line = min(total_lines, end_line + context_lines)
    snippet = "\n".join(
        f"{line_number}\t{lines[line_number - 1]}"
        for line_number in range(snippet_start_line, snippet_end_line + 1)
    )

    if start_line == end_line:
        line_range = f"line {start_line}"
    else:
        line_range = f"lines {start_line}-{end_line}"

    return line_range, snippet


def _line_number_at_index(text: str, index: int) -> int:
    bounded_index = max(0, min(index, len(text)))
    return text.count("\n", 0, bounded_index) + 1
