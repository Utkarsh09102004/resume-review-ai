import json
import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from fastmcp import Context, FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import CurrentContext

from app.core.compile import CompileError, CompileServiceUnavailable, compile_latex
from app.core.resume_ops import ResumeNotFoundError, get_resume, list_resumes, update_resume_latex
from app.mcp import get_session
from app.models.resume import Resume


@dataclass(frozen=True)
class _MatchSpan:
    start: int
    end: int
    whitespace_adjusted: bool = False


@dataclass(frozen=True)
class _NormalizedText:
    text: str
    starts: list[int]
    ends: list[int]


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
            match = _find_unique_match(
                original_latex,
                search,
                not_found_message="Text not found. Verify the exact text exists in the resume.",
            )
            updated_latex = original_latex[: match.start] + replace + original_latex[match.end :]
            await update_resume_latex(session, user_id, parsed_resume_id, updated_latex)

        return _format_search_replace_result(
            original_latex,
            updated_latex,
            match.start,
            match.end,
            replace,
            whitespace_adjusted=match.whitespace_adjusted,
        )

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
            match = _find_unique_match(
                original_latex,
                after,
                not_found_message="Anchor not found. Verify the exact anchor text exists in the resume.",
            )
            insert_at = match.end
            updated_latex = original_latex[:insert_at] + "\n" + content + original_latex[insert_at:]
            await update_resume_latex(session, user_id, parsed_resume_id, updated_latex)

        return _format_insert_content_result(
            original_latex,
            updated_latex,
            match.start,
            match.end,
            content,
            whitespace_adjusted=match.whitespace_adjusted,
        )

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
            match = _find_unique_match(
                original_latex,
                text,
                not_found_message="Text not found. Verify the exact text exists in the resume.",
            )
            updated_latex = original_latex[: match.start] + original_latex[match.end :]
            await update_resume_latex(session, user_id, parsed_resume_id, updated_latex)

        return _format_delete_content_result(
            original_latex,
            updated_latex,
            match.start,
            match.end,
            whitespace_adjusted=match.whitespace_adjusted,
        )

    @mcp.tool
    async def compile_resume(resume_id: str, ctx: Context = CurrentContext()) -> str:
        user_id = await _require_user_id(ctx)
        parsed_resume_id = _parse_uuid(resume_id)

        async with get_session() as session:
            try:
                resume = await get_resume(session, user_id, parsed_resume_id)
            except ResumeNotFoundError as err:
                raise ToolError(err.detail) from err

        try:
            await compile_latex(resume.latex_source)
        except CompileServiceUnavailable as err:
            raise ToolError("Compilation service is currently unavailable. Try again later.") from err
        except CompileError as err:
            return _format_compile_error_result(err.detail)

        return "Compilation successful. Resume compiles without errors."


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


def _find_unique_match(text: str, needle: str, *, not_found_message: str) -> _MatchSpan:
    match_count = text.count(needle)
    if match_count == 0:
        normalized_text = _normalize_whitespace(text)
        normalized_needle = _normalize_whitespace(needle)

        if not normalized_needle.text:
            raise ToolError(not_found_message)

        normalized_match_count = normalized_text.text.count(normalized_needle.text)
        if normalized_match_count == 0:
            raise ToolError(not_found_message)
        if normalized_match_count > 1:
            raise ToolError(
                f"Found {normalized_match_count} matches. Provide more surrounding context for a unique match."
            )

        normalized_start = normalized_text.text.find(normalized_needle.text)
        normalized_end = normalized_start + len(normalized_needle.text)
        return _MatchSpan(
            start=normalized_text.starts[normalized_start],
            end=normalized_text.ends[normalized_end - 1],
            whitespace_adjusted=True,
        )
    if match_count > 1:
        raise ToolError(f"Found {match_count} matches. Provide more surrounding context for a unique match.")
    match_start = text.find(needle)
    return _MatchSpan(start=match_start, end=match_start + len(needle))


def _normalize_whitespace(text: str) -> _NormalizedText:
    normalized_chars: list[str] = []
    starts: list[int] = []
    ends: list[int] = []
    line_start = 0

    for line in text.splitlines(keepends=True):
        line_ending_length = 0
        if line.endswith("\r\n"):
            line_ending_length = 2
        elif line.endswith("\n") or line.endswith("\r"):
            line_ending_length = 1

        line_body = line[:-line_ending_length] if line_ending_length else line
        trimmed_length = len(line_body)
        while trimmed_length > 0 and line_body[trimmed_length - 1].isspace():
            trimmed_length -= 1

        for offset in range(trimmed_length):
            normalized_chars.append(line_body[offset])
            starts.append(line_start + offset)
            ends.append(line_start + offset + 1)

        trimmed_start = line_start + trimmed_length
        line_end = line_start + len(line)

        if line_ending_length:
            if len(normalized_chars) >= 2 and normalized_chars[-1] == "\n" and normalized_chars[-2] == "\n":
                ends[-1] = line_end
            else:
                normalized_chars.append("\n")
                starts.append(trimmed_start)
                ends.append(line_end)
        elif trimmed_start < line_end and ends:
            ends[-1] = line_end

        line_start = line_end

    return _NormalizedText("".join(normalized_chars), starts, ends)


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
    match_end: int,
    replace: str,
    *,
    whitespace_adjusted: bool = False,
) -> str:
    before_range, before_snippet = _format_context_with_line_numbers(
        original_latex,
        match_start,
        match_end,
    )
    after_range, after_snippet = _format_context_with_line_numbers(
        updated_latex,
        match_start,
        match_start + len(replace),
    )

    return (
        f"{_format_match_result_prefix('Replaced 1 match', whitespace_adjusted)}\n"
        f"Before ({before_range}):\n{before_snippet}\n"
        f"After ({after_range}):\n{after_snippet}"
    )


def _format_insert_content_result(
    original_latex: str,
    updated_latex: str,
    match_start: int,
    match_end: int,
    content: str,
    *,
    whitespace_adjusted: bool = False,
) -> str:
    anchor_range, anchor_snippet = _format_context_with_line_numbers(
        original_latex,
        match_start,
        match_end,
    )
    insert_start = match_end + 1
    inserted_range, inserted_snippet = _format_context_with_line_numbers(
        updated_latex,
        insert_start,
        insert_start + len(content),
    )

    return (
        f"{_format_match_result_prefix('Inserted content after 1 match', whitespace_adjusted)}\n"
        f"Anchor ({anchor_range}):\n{anchor_snippet}\n"
        f"After insertion ({inserted_range}):\n{inserted_snippet}"
    )


def _format_delete_content_result(
    original_latex: str,
    updated_latex: str,
    match_start: int,
    match_end: int,
    *,
    whitespace_adjusted: bool = False,
) -> str:
    deleted_range, deleted_snippet = _format_context_with_line_numbers(
        original_latex,
        match_start,
        match_end,
    )
    after_range, after_snippet = _format_context_with_line_numbers(
        updated_latex,
        match_start,
        match_start,
    )

    return (
        f"{_format_match_result_prefix('Deleted 1 match', whitespace_adjusted)}\n"
        f"Removed ({deleted_range}):\n{deleted_snippet}\n"
        f"After deletion ({after_range}):\n{after_snippet}"
    )


def _format_match_result_prefix(action: str, whitespace_adjusted: bool) -> str:
    suffix = " (whitespace-adjusted)" if whitespace_adjusted else ""
    return f"{action}{suffix}."


def _format_compile_error_result(detail: Any) -> str:
    if isinstance(detail, dict):
        parts = ["Compilation failed."]
        message = _stringify_compile_detail(detail.get("message") or detail.get("detail"))
        log = _stringify_compile_detail(detail.get("log"))

        if message:
            parts.append(f"Message: {message}")
        if log:
            parts.append(f"Log:\n{log}")

        remaining = {
            key: value
            for key, value in detail.items()
            if key not in {"success", "message", "log", "detail"} and value is not None
        }
        if remaining:
            parts.append(
                "Additional details:\n"
                f"{json.dumps(remaining, ensure_ascii=False, indent=2, sort_keys=True)}"
            )

        if len(parts) == 1:
            parts.append(_stringify_compile_detail(detail))

        return "\n".join(parts)

    return f"Compilation failed.\n{_stringify_compile_detail(detail)}"


def _stringify_compile_detail(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)
    return str(value)


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
