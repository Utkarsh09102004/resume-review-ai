import json
import uuid
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any

from fastmcp import Context, FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import CurrentContext

from app.core.compile import CompileError, CompileServiceUnavailable, compile_latex
from app.core.resume_ops import (
    ResumeNotFoundError,
    ResumeVersionConflictError,
    apply_resume_updates,
    get_resume,
    list_resumes,
)
from app.database import get_session
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


@dataclass(frozen=True)
class _EditApplication:
    updated_latex: str
    result: str
    summary: str


_RESUME_VERSIONS_STATE_KEY = "resume_versions"
_READ_BEFORE_EDITING_ERROR = "Call read_resume before editing this resume."
_STALE_RESUME_ERROR = "Resume changed since your last read; call read_resume again."


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

        await _store_last_read_resume_version(ctx, parsed_resume_id, resume.version)
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
            application = await _apply_versioned_edit(
                ctx,
                session,
                user_id,
                parsed_resume_id,
                lambda latex_source: _apply_search_replace(latex_source, search, replace),
            )

        return application.result

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
            application = await _apply_versioned_edit(
                ctx,
                session,
                user_id,
                parsed_resume_id,
                lambda latex_source: _apply_insert_content(latex_source, after, content),
            )

        return application.result

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
            application = await _apply_versioned_edit(
                ctx,
                session,
                user_id,
                parsed_resume_id,
                lambda latex_source: _apply_delete_content(latex_source, text),
            )

        return application.result

    @mcp.tool
    async def batch_edit(
        resume_id: str,
        operations: list[dict[str, Any]],
        ctx: Context = CurrentContext(),
    ) -> str:
        user_id = await _require_user_id(ctx)
        parsed_resume_id = _parse_uuid(resume_id)

        async with get_session() as session:
            if not operations:
                try:
                    await get_resume(session, user_id, parsed_resume_id)
                except ResumeNotFoundError as err:
                    raise ToolError(err.detail) from err
                return "No operations to apply."

            applications = await _apply_versioned_batch_edit(
                ctx,
                session,
                user_id,
                parsed_resume_id,
                operations,
            )

        return _format_batch_success_result(applications)

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
            result = await compile_latex(resume.latex_source)
        except CompileServiceUnavailable as err:
            raise ToolError("Compilation service is currently unavailable. Try again later.") from err
        except CompileError as err:
            return _format_compile_error_result(err.detail)

        msg = "Compilation successful. Resume compiles without errors."
        if result.pages is not None:
            msg += f" Pages: {result.pages}."
        return msg


async def _require_user_id(ctx: Context) -> str:
    user_id = await ctx.get_state("user_id")
    if not isinstance(user_id, str) or not user_id:
        raise ToolError("Authentication context missing user_id")
    return user_id


async def _get_resume_versions(ctx: Context) -> dict[str, int]:
    resume_versions = await ctx.get_state(_RESUME_VERSIONS_STATE_KEY)
    if not isinstance(resume_versions, dict):
        return {}

    return {
        resume_id: version
        for resume_id, version in resume_versions.items()
        if isinstance(resume_id, str) and isinstance(version, int)
    }


async def _store_last_read_resume_version(ctx: Context, resume_id: uuid.UUID, version: int) -> None:
    resume_versions = await _get_resume_versions(ctx)
    resume_versions[str(resume_id)] = version
    await ctx.set_state(_RESUME_VERSIONS_STATE_KEY, resume_versions)


async def _load_resume_for_edit(
    ctx: Context,
    session: Any,
    user_id: str,
    resume_id: uuid.UUID,
) -> Resume:
    try:
        resume = await get_resume(session, user_id, resume_id)
    except ResumeNotFoundError as err:
        raise ToolError(err.detail) from err

    resume_versions = await _get_resume_versions(ctx)
    last_read_version = resume_versions.get(str(resume_id))
    if last_read_version is None:
        raise ToolError(_READ_BEFORE_EDITING_ERROR)
    if last_read_version != resume.version:
        raise ToolError(_STALE_RESUME_ERROR)

    return resume


async def _apply_versioned_edit(
    ctx: Context,
    session: Any,
    user_id: str,
    resume_id: uuid.UUID,
    apply_edit: Callable[[str], _EditApplication],
) -> _EditApplication:
    resume = await _load_resume_for_edit(ctx, session, user_id, resume_id)
    application = apply_edit(resume.latex_source)

    try:
        updated_resume = await apply_resume_updates(
            session,
            user_id,
            resume_id,
            latex_source=application.updated_latex,
            expected_version=resume.version,
        )
    except ResumeVersionConflictError as err:
        raise ToolError(_STALE_RESUME_ERROR) from err

    updated_version = getattr(updated_resume, "version", None)
    await _store_last_read_resume_version(
        ctx,
        resume_id,
        updated_version if isinstance(updated_version, int) else resume.version + 1,
    )
    return application


async def _apply_versioned_batch_edit(
    ctx: Context,
    session: Any,
    user_id: str,
    resume_id: uuid.UUID,
    operations: list[dict[str, Any]],
) -> list[_EditApplication]:
    resume = await _load_resume_for_edit(ctx, session, user_id, resume_id)
    updated_latex, applications = _apply_batch_operations(resume.latex_source, operations)

    try:
        updated_resume = await apply_resume_updates(
            session,
            user_id,
            resume_id,
            latex_source=updated_latex,
            expected_version=resume.version,
        )
    except ResumeVersionConflictError as err:
        raise ToolError(_STALE_RESUME_ERROR) from err

    updated_version = getattr(updated_resume, "version", None)
    await _store_last_read_resume_version(
        ctx,
        resume_id,
        updated_version if isinstance(updated_version, int) else resume.version + 1,
    )
    return applications


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


def _apply_batch_operations(
    latex_source: str,
    operations: list[dict[str, Any]],
) -> tuple[str, list[_EditApplication]]:
    working_latex = latex_source
    applications: list[_EditApplication] = []

    for operation_index, operation in enumerate(operations, start=1):
        try:
            application = _apply_batch_operation(working_latex, operation)
        except ToolError as err:
            raise ToolError(
                _format_batch_failure_result(
                    operation_index,
                    str(err),
                    completed_count=len(applications),
                )
            ) from err

        working_latex = application.updated_latex
        applications.append(application)

    return working_latex, applications


def _apply_batch_operation(
    latex_source: str,
    operation: dict[str, Any],
) -> _EditApplication:
    if not isinstance(operation, dict):
        raise ToolError("Invalid operation: expected an object.")

    operation_type = operation.get("type")
    if operation_type == "search_replace":
        search = _require_string_field(operation, "search", allow_empty=False)
        replace = _require_string_field(operation, "replace", allow_empty=True)
        return _apply_search_replace(latex_source, search, replace)
    if operation_type == "insert":
        after = _require_string_field(operation, "after", allow_empty=False)
        content = _require_string_field(operation, "content", allow_empty=False)
        return _apply_insert_content(latex_source, after, content)
    if operation_type == "delete":
        text = _require_string_field(operation, "text", allow_empty=False)
        return _apply_delete_content(latex_source, text)

    raise ToolError(
        f"Invalid operation type {operation_type!r}. Expected one of 'search_replace', 'insert', or 'delete'."
    )


def _require_string_field(
    operation: dict[str, Any],
    field_name: str,
    *,
    allow_empty: bool,
) -> str:
    value = operation.get(field_name)
    if not isinstance(value, str):
        raise ToolError(f"Field {field_name!r} must be a string.")
    if not allow_empty and not value:
        raise ToolError(f"Field {field_name!r} must be non-empty.")
    return value


def _apply_search_replace(latex_source: str, search: str, replace: str) -> _EditApplication:
    _validate_search_text(search)

    match = _find_unique_match(
        latex_source,
        search,
        not_found_message="Text not found. Verify the exact text exists in the resume.",
    )
    updated_latex = latex_source[: match.start] + replace + latex_source[match.end :]
    line_range = _format_line_range(latex_source, match.start, match.end)

    return _EditApplication(
        updated_latex=updated_latex,
        result=_format_search_replace_result(
            latex_source,
            updated_latex,
            match.start,
            match.end,
            replace,
            whitespace_adjusted=match.whitespace_adjusted,
        ),
        summary=(
            f"search_replace ({line_range}): "
            f"{_format_match_result_prefix('Replaced 1 match', match.whitespace_adjusted)}"
        ),
    )


def _apply_insert_content(latex_source: str, after: str, content: str) -> _EditApplication:
    _validate_non_empty_text(after, "after")
    _validate_non_empty_text(content, "content")

    match = _find_unique_match(
        latex_source,
        after,
        not_found_message="Anchor not found. Verify the exact anchor text exists in the resume.",
    )
    insert_at = match.end
    updated_latex = latex_source[:insert_at] + "\n" + content + latex_source[insert_at:]
    anchor_range = _format_line_range(latex_source, match.start, match.end)
    line_count = _count_lines(content)
    line_label = "line" if line_count == 1 else "lines"
    whitespace_suffix = " (whitespace-adjusted)" if match.whitespace_adjusted else ""

    return _EditApplication(
        updated_latex=updated_latex,
        result=_format_insert_content_result(
            latex_source,
            updated_latex,
            match.start,
            match.end,
            content,
            whitespace_adjusted=match.whitespace_adjusted,
        ),
        summary=f"insert (after {anchor_range}): Inserted {line_count} {line_label}{whitespace_suffix}.",
    )


def _apply_delete_content(latex_source: str, text: str) -> _EditApplication:
    _validate_non_empty_text(text, "text")

    match = _find_unique_match(
        latex_source,
        text,
        not_found_message="Text not found. Verify the exact text exists in the resume.",
    )
    updated_latex = latex_source[: match.start] + latex_source[match.end :]
    line_range = _format_line_range(latex_source, match.start, match.end)

    return _EditApplication(
        updated_latex=updated_latex,
        result=_format_delete_content_result(
            latex_source,
            updated_latex,
            match.start,
            match.end,
            whitespace_adjusted=match.whitespace_adjusted,
        ),
        summary=(f"delete ({line_range}): {_format_match_result_prefix('Deleted 1 match', match.whitespace_adjusted)}"),
    )


def _find_unique_match(text: str, needle: str, *, not_found_message: str) -> _MatchSpan:
    exact_matches = _find_match_spans(text, needle)
    if not exact_matches:
        normalized_text = _normalize_whitespace(text)
        normalized_needle = _normalize_whitespace(needle)

        if not normalized_needle.text:
            raise ToolError(not_found_message)

        normalized_starts = _find_match_starts(normalized_text.text, normalized_needle.text)
        if not normalized_starts:
            raise ToolError(not_found_message)

        normalized_matches = [
            _MatchSpan(
                start=normalized_text.starts[normalized_start],
                end=normalized_text.ends[normalized_start + len(normalized_needle.text) - 1],
                whitespace_adjusted=True,
            )
            for normalized_start in normalized_starts
        ]
        if len(normalized_matches) > 1:
            raise ToolError(_format_ambiguous_match_error(text, normalized_matches))

        return normalized_matches[0]

    if len(exact_matches) > 1:
        raise ToolError(_format_ambiguous_match_error(text, exact_matches))

    return exact_matches[0]


def _find_match_spans(text: str, needle: str) -> list[_MatchSpan]:
    return [
        _MatchSpan(start=match_start, end=match_start + len(needle)) for match_start in _find_match_starts(text, needle)
    ]


def _find_match_starts(text: str, needle: str) -> list[int]:
    if not needle:
        return []

    starts: list[int] = []
    search_start = 0
    while True:
        match_start = text.find(needle, search_start)
        if match_start == -1:
            return starts
        starts.append(match_start)
        search_start = match_start + len(needle)


def _format_ambiguous_match_error(
    text: str,
    matches: Sequence[_MatchSpan],
    *,
    limit: int = 5,
) -> str:
    parts = [f"Found {len(matches)} matches. Include more surrounding context to target a specific one."]

    for index, match in enumerate(matches[:limit], start=1):
        line_range, snippet = _format_context_with_line_numbers(text, match.start, match.end)
        parts.append(f"Match {index} ({line_range}):\n{snippet}")

    remaining = len(matches) - min(len(matches), limit)
    if remaining > 0:
        parts.append(f"...and {remaining} more matches.")

    return "\n\n".join(parts)


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


def _format_batch_success_result(applications: Sequence[_EditApplication]) -> str:
    operation_label = "operation" if len(applications) == 1 else "operations"
    summary_lines = "\n".join(
        f"[{index}] {application.summary}" for index, application in enumerate(applications, start=1)
    )
    return f"Applied {len(applications)} {operation_label} successfully.\n\n{summary_lines}"


def _format_batch_failure_result(operation_index: int, detail: str, *, completed_count: int) -> str:
    if completed_count == 0:
        rollback_message = "No changes were saved."
    elif completed_count == 1:
        rollback_message = "No changes were saved. Operation 1 was rolled back."
    else:
        rollback_message = f"No changes were saved. Operations 1-{completed_count} were rolled back."

    return f"Operation {operation_index} failed: {detail}\n\n{rollback_message}"


def _count_lines(text: str) -> int:
    line_count = len(text.splitlines())
    return line_count or 1


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
            parts.append(f"Additional details:\n{json.dumps(remaining, ensure_ascii=False, indent=2, sort_keys=True)}")

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
        f"{line_number}\t{lines[line_number - 1]}" for line_number in range(snippet_start_line, snippet_end_line + 1)
    )

    return _format_line_range(text, start_index, end_index), snippet


def _format_line_range(text: str, start_index: int, end_index: int) -> str:
    start_line = _line_number_at_index(text, start_index)
    end_reference_index = start_index if end_index <= start_index else end_index - 1
    end_line = _line_number_at_index(text, end_reference_index)
    if start_line == end_line:
        return f"line {start_line}"
    return f"lines {start_line}-{end_line}"


def _line_number_at_index(text: str, index: int) -> int:
    bounded_index = max(0, min(index, len(text)))
    return text.count("\n", 0, bounded_index) + 1
