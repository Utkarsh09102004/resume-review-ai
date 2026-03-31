import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.middleware import MiddlewareContext
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from starlette.applications import Starlette
from starlette.middleware import Middleware as ASGIMiddleware
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.core.auth import AuthError
from app.core.compile import CompileError, CompileServiceUnavailable
from app.mcp.auth_middleware import BearerAuthHTTPMiddleware, LogtoAuthMiddleware
from app.mcp.tools import register_tools
from app.models.resume import Resume
from mcp_server import create_mcp_server


class _FakeFastMCPContext:
    def __init__(self) -> None:
        self.state: dict[str, Any] = {}

    async def set_state(self, key: str, value: Any, *, serializable: bool = True) -> None:
        assert serializable is True
        self.state[key] = value


class _FakeToolContext:
    def __init__(self, user_id: str | None) -> None:
        self.user_id = user_id

    async def get_state(self, key: str) -> str | None:
        assert key == "user_id"
        return self.user_id


async def _ok_endpoint(_request) -> JSONResponse:
    return JSONResponse({"ok": True})


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", True)
async def test_http_middleware_rejects_missing_bearer_token() -> None:
    app = Starlette(
        routes=[Route("/mcp", _ok_endpoint, methods=["POST"])],
        middleware=[ASGIMiddleware(BearerAuthHTTPMiddleware)],
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/mcp")

    assert response.status_code == 401
    assert response.json() == {"detail": "Missing authorization header"}


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", False)
async def test_http_middleware_allows_dev_mode_requests() -> None:
    app = Starlette(
        routes=[Route("/mcp", _ok_endpoint, methods=["POST"])],
        middleware=[ASGIMiddleware(BearerAuthHTTPMiddleware)],
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/mcp")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", True)
@patch("app.mcp.auth_middleware.validate_token", new_callable=AsyncMock, side_effect=AuthError("Invalid token"))
async def test_http_middleware_rejects_invalid_bearer_token(_mock_validate: AsyncMock) -> None:
    app = Starlette(
        routes=[Route("/mcp", _ok_endpoint, methods=["POST"])],
        middleware=[ASGIMiddleware(BearerAuthHTTPMiddleware)],
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": "Bearer invalid-token"},
    ) as client:
        response = await client.post("/mcp")

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid token"}


@pytest.mark.asyncio
@patch("app.mcp.auth_middleware.settings.AUTH_ENABLED", True)
@patch("app.mcp.auth_middleware.validate_token", new_callable=AsyncMock, return_value="user-123")
@patch("app.mcp.auth_middleware.get_http_headers", return_value={"authorization": "Bearer valid-token"})
async def test_fastmcp_middleware_sets_user_id_state(
    _mock_headers: Any,
    _mock_validate: AsyncMock,
) -> None:
    fastmcp_context = _FakeFastMCPContext()
    middleware = LogtoAuthMiddleware()
    call_next = AsyncMock(return_value={"ok": True})
    context = MiddlewareContext(
        message={"jsonrpc": "2.0", "method": "initialize"},
        fastmcp_context=fastmcp_context,
        method="initialize",
        type="request",
    )

    result = await middleware.on_request(context, call_next)

    assert result == {"ok": True}
    assert fastmcp_context.state == {"user_id": "user-123"}
    call_next.assert_awaited_once_with(context)


@pytest.mark.asyncio
async def test_create_mcp_server_registers_resume_tools() -> None:
    server = create_mcp_server()

    tools = await server.list_tools(run_middleware=False)
    tool_names = {tool.name for tool in tools}

    assert "list_user_resumes" in tool_names
    assert "read_resume" in tool_names
    assert "search_replace" in tool_names
    assert "insert_content" in tool_names
    assert "delete_content" in tool_names
    assert "compile_resume" in tool_names


@pytest.mark.asyncio
async def test_list_user_resumes_returns_only_owned_resumes_formatted(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    newer_resume_id = uuid.uuid4()
    older_resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add_all(
            [
                Resume(
                    id=older_resume_id,
                    user_id="test-user",
                    title="Data Science Resume",
                    latex_source="older",
                    updated_at=datetime(2026, 3, 25, tzinfo=UTC),
                ),
                Resume(
                    id=newer_resume_id,
                    user_id="test-user",
                    title="Software Engineer Resume",
                    latex_source="newer",
                    updated_at=datetime(2026, 3, 28, tzinfo=UTC),
                ),
                Resume(
                    user_id="other-user",
                    title="Hidden Resume",
                    latex_source="hidden",
                    updated_at=datetime(2026, 3, 30, tzinfo=UTC),
                ),
            ]
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("list_user_resumes")
    assert tool is not None

    result = await tool.fn(ctx=_FakeToolContext("test-user"))

    assert result == (
        f'- {newer_resume_id} | "Software Engineer Resume" | updated 2026-03-28\n'
        f'- {older_resume_id} | "Data Science Resume" | updated 2026-03-25'
    )


@pytest.mark.asyncio
async def test_list_user_resumes_requires_user_id() -> None:
    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("list_user_resumes")
    assert tool is not None

    with pytest.raises(ToolError, match="Authentication context missing user_id"):
        await tool.fn(ctx=_FakeToolContext(None))


@pytest.mark.asyncio
async def test_read_resume_returns_latex_with_line_numbers(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source="\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("read_resume")
    assert tool is not None

    result = await tool.fn(resume_id=str(resume_id), ctx=_FakeToolContext("test-user"))

    assert result == (
        "1\t\\documentclass{article}\n"
        "2\t\\begin{document}\n"
        "3\tHello\n"
        "4\t\\end{document}"
    )


@pytest.mark.asyncio
async def test_read_resume_rejects_invalid_uuid() -> None:
    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("read_resume")
    assert tool is not None

    with pytest.raises(ToolError, match="Invalid resume_id: expected a UUID string"):
        await tool.fn(resume_id="not-a-uuid", ctx=_FakeToolContext("test-user"))


@pytest.mark.asyncio
async def test_read_resume_rejects_other_users_resume(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="other-user",
                title="Resume",
                latex_source="secret",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("read_resume")
    assert tool is not None

    with pytest.raises(ToolError, match="Resume not found"):
        await tool.fn(resume_id=str(resume_id), ctx=_FakeToolContext("test-user"))


@pytest.mark.asyncio
async def test_read_resume_rejects_nonexistent_resume(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("read_resume")
    assert tool is not None

    with pytest.raises(ToolError, match="Resume not found"):
        await tool.fn(resume_id=str(uuid.uuid4()), ctx=_FakeToolContext("test-user"))


@pytest.mark.asyncio
async def test_search_replace_updates_owned_resume_and_returns_context(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()
    original_latex = "\\documentclass{article}\n\\begin{document}\nOld role title\n\\end{document}"

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source=original_latex,
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("search_replace")
    assert tool is not None

    result = await tool.fn(
        resume_id=str(resume_id),
        search="Old role title",
        replace="Senior role title",
        ctx=_FakeToolContext("test-user"),
    )

    assert result == (
        "Replaced 1 match.\n"
        "Before (line 3):\n"
        "2\t\\begin{document}\n"
        "3\tOld role title\n"
        "4\t\\end{document}\n"
        "After (line 3):\n"
        "2\t\\begin{document}\n"
        "3\tSenior role title\n"
        "4\t\\end{document}"
    )

    async with session_factory() as session:
        saved_resume = await session.scalar(select(Resume).where(Resume.id == resume_id))

    assert saved_resume is not None
    assert saved_resume.latex_source == (
        "\\documentclass{article}\n\\begin{document}\nSenior role title\n\\end{document}"
    )


@pytest.mark.asyncio
async def test_search_replace_falls_back_for_trailing_whitespace_mismatch(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()
    original_latex = "\\documentclass{article}\n\\begin{document}\nOld role title   \n\\end{document}"

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source=original_latex,
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("search_replace")
    assert tool is not None

    result = await tool.fn(
        resume_id=str(resume_id),
        search="Old role title\n",
        replace="Senior role title\n",
        ctx=_FakeToolContext("test-user"),
    )

    assert result == (
        "Replaced 1 match (whitespace-adjusted).\n"
        "Before (line 3):\n"
        "2\t\\begin{document}\n"
        "3\tOld role title   \n"
        "4\t\\end{document}\n"
        "After (line 3):\n"
        "2\t\\begin{document}\n"
        "3\tSenior role title\n"
        "4\t\\end{document}"
    )

    async with session_factory() as session:
        saved_resume = await session.scalar(select(Resume).where(Resume.id == resume_id))

    assert saved_resume is not None
    assert saved_resume.latex_source == (
        "\\documentclass{article}\n\\begin{document}\nSenior role title\n\\end{document}"
    )


@pytest.mark.asyncio
async def test_search_replace_rejects_invalid_uuid() -> None:
    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("search_replace")
    assert tool is not None

    with pytest.raises(ToolError, match="Invalid resume_id: expected a UUID string"):
        await tool.fn(
            resume_id="not-a-uuid",
            search="old",
            replace="new",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_search_replace_rejects_empty_search() -> None:
    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("search_replace")
    assert tool is not None

    with pytest.raises(ToolError, match="Invalid search: must be a non-empty string"):
        await tool.fn(
            resume_id=str(uuid.uuid4()),
            search="",
            replace="new",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_search_replace_rejects_missing_text(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source="one unique line",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("search_replace")
    assert tool is not None

    with pytest.raises(ToolError, match=r"Text not found\. Verify the exact text exists in the resume\."):
        await tool.fn(
            resume_id=str(resume_id),
            search="missing",
            replace="new",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_search_replace_falls_back_for_mixed_whitespace_mismatch(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()
    original_latex = "Start\r\n\r\n\r\nTabbed line\t \r\nEnd"

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source=original_latex,
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("search_replace")
    assert tool is not None

    result = await tool.fn(
        resume_id=str(resume_id),
        search="Start\n\nTabbed line\nEnd",
        replace="Start\n\nNormalized line\nEnd",
        ctx=_FakeToolContext("test-user"),
    )

    assert result.startswith("Replaced 1 match (whitespace-adjusted).\n")

    async with session_factory() as session:
        saved_resume = await session.scalar(select(Resume).where(Resume.id == resume_id))

    assert saved_resume is not None
    assert saved_resume.latex_source == "Start\n\nNormalized line\nEnd"


@pytest.mark.asyncio
async def test_search_replace_rejects_ambiguous_match(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source="duplicate\nvalue\nduplicate\nvalue",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("search_replace")
    assert tool is not None

    with pytest.raises(
        ToolError,
        match=r"Found 2 matches\. Provide more surrounding context for a unique match\.",
    ):
        await tool.fn(
            resume_id=str(resume_id),
            search="duplicate",
            replace="unique",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_search_replace_rejects_ambiguous_normalized_match(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source="duplicate   \n\n\nvalue\nduplicate\t\n\nvalue",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("search_replace")
    assert tool is not None

    with pytest.raises(
        ToolError,
        match=r"Found 2 matches\. Provide more surrounding context for a unique match\.",
    ):
        await tool.fn(
            resume_id=str(resume_id),
            search="duplicate\n\nvalue",
            replace="unique",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_search_replace_rejects_other_users_resume(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="other-user",
                title="Resume",
                latex_source="secret",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("search_replace")
    assert tool is not None

    with pytest.raises(ToolError, match="Resume not found"):
        await tool.fn(
            resume_id=str(resume_id),
            search="secret",
            replace="shared",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_insert_content_updates_owned_resume_and_returns_context(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()
    original_latex = (
        "\\documentclass{article}\n"
        "\\begin{document}\n"
        "\\section*{Experience}\n"
        "Existing entry\n"
        "\\end{document}"
    )

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source=original_latex,
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("insert_content")
    assert tool is not None

    result = await tool.fn(
        resume_id=str(resume_id),
        after="\\section*{Experience}",
        content="\\textbf{New role}",
        ctx=_FakeToolContext("test-user"),
    )

    assert result == (
        "Inserted content after 1 match.\n"
        "Anchor (line 3):\n"
        "2\t\\begin{document}\n"
        "3\t\\section*{Experience}\n"
        "4\tExisting entry\n"
        "After insertion (line 4):\n"
        "3\t\\section*{Experience}\n"
        "4\t\\textbf{New role}\n"
        "5\tExisting entry"
    )

    async with session_factory() as session:
        saved_resume = await session.scalar(select(Resume).where(Resume.id == resume_id))

    assert saved_resume is not None
    assert saved_resume.latex_source == (
        "\\documentclass{article}\n"
        "\\begin{document}\n"
        "\\section*{Experience}\n"
        "\\textbf{New role}\n"
        "Existing entry\n"
        "\\end{document}"
    )


@pytest.mark.asyncio
async def test_insert_content_falls_back_for_blank_line_mismatch(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()
    original_latex = (
        "\\documentclass{article}\n"
        "\\begin{document}\n"
        "\\section*{Experience}\n"
        "\n"
        "\n"
        "Existing entry\n"
        "\\end{document}"
    )

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source=original_latex,
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("insert_content")
    assert tool is not None

    result = await tool.fn(
        resume_id=str(resume_id),
        after="\\section*{Experience}\n\nExisting entry",
        content="\\item New project",
        ctx=_FakeToolContext("test-user"),
    )

    assert result.startswith("Inserted content after 1 match (whitespace-adjusted).\n")

    async with session_factory() as session:
        saved_resume = await session.scalar(select(Resume).where(Resume.id == resume_id))

    assert saved_resume is not None
    assert saved_resume.latex_source == (
        "\\documentclass{article}\n"
        "\\begin{document}\n"
        "\\section*{Experience}\n"
        "\n"
        "\n"
        "Existing entry\n"
        "\\item New project\n"
        "\\end{document}"
    )


@pytest.mark.asyncio
async def test_insert_content_rejects_invalid_inputs() -> None:
    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("insert_content")
    assert tool is not None

    with pytest.raises(ToolError, match="Invalid after: must be a non-empty string"):
        await tool.fn(
            resume_id=str(uuid.uuid4()),
            after="",
            content="new content",
            ctx=_FakeToolContext("test-user"),
        )

    with pytest.raises(ToolError, match="Invalid content: must be a non-empty string"):
        await tool.fn(
            resume_id=str(uuid.uuid4()),
            after="anchor",
            content="",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_insert_content_rejects_missing_anchor(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source="\\section*{Experience}\nExisting entry",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("insert_content")
    assert tool is not None

    with pytest.raises(
        ToolError,
        match=r"Anchor not found\. Verify the exact anchor text exists in the resume\.",
    ):
        await tool.fn(
            resume_id=str(resume_id),
            after="\\section*{Projects}",
            content="\\item New project",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_insert_content_does_not_ignore_leading_indentation(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source="\\begin{itemize}\n  \\item Existing project\n\\end{itemize}",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("insert_content")
    assert tool is not None

    with pytest.raises(
        ToolError,
        match=r"Anchor not found\. Verify the exact anchor text exists in the resume\.",
    ):
        await tool.fn(
            resume_id=str(resume_id),
            after="\\begin{itemize}\n\\item Existing project",
            content="\\item New project",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_insert_content_rejects_ambiguous_anchor(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source="duplicate\nanchor\nduplicate\nanchor",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("insert_content")
    assert tool is not None

    with pytest.raises(
        ToolError,
        match=r"Found 2 matches\. Provide more surrounding context for a unique match\.",
    ):
        await tool.fn(
            resume_id=str(resume_id),
            after="duplicate",
            content="unique",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_insert_content_rejects_other_users_resume(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="other-user",
                title="Resume",
                latex_source="secret",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("insert_content")
    assert tool is not None

    with pytest.raises(ToolError, match="Resume not found"):
        await tool.fn(
            resume_id=str(resume_id),
            after="secret",
            content="shared",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_delete_content_updates_owned_resume_and_returns_context(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()
    original_latex = (
        "\\documentclass{article}\n"
        "\\begin{document}\n"
        "Old role\n"
        "Remaining role\n"
        "\\end{document}"
    )

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source=original_latex,
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("delete_content")
    assert tool is not None

    result = await tool.fn(
        resume_id=str(resume_id),
        text="Old role\n",
        ctx=_FakeToolContext("test-user"),
    )

    assert result == (
        "Deleted 1 match.\n"
        "Removed (line 3):\n"
        "2\t\\begin{document}\n"
        "3\tOld role\n"
        "4\tRemaining role\n"
        "After deletion (line 3):\n"
        "2\t\\begin{document}\n"
        "3\tRemaining role\n"
        "4\t\\end{document}"
    )

    async with session_factory() as session:
        saved_resume = await session.scalar(select(Resume).where(Resume.id == resume_id))

    assert saved_resume is not None
    assert saved_resume.latex_source == (
        "\\documentclass{article}\n"
        "\\begin{document}\n"
        "Remaining role\n"
        "\\end{document}"
    )


@pytest.mark.asyncio
async def test_delete_content_falls_back_for_crlf_mismatch(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()
    original_latex = "Header\r\nDelete me\r\nKeep me\r\n"

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source=original_latex,
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("delete_content")
    assert tool is not None

    result = await tool.fn(
        resume_id=str(resume_id),
        text="Delete me\n",
        ctx=_FakeToolContext("test-user"),
    )

    assert result.startswith("Deleted 1 match (whitespace-adjusted).\n")

    async with session_factory() as session:
        saved_resume = await session.scalar(select(Resume).where(Resume.id == resume_id))

    assert saved_resume is not None
    assert saved_resume.latex_source == "Header\r\nKeep me\r\n"


@pytest.mark.asyncio
async def test_delete_content_rejects_invalid_text() -> None:
    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("delete_content")
    assert tool is not None

    with pytest.raises(ToolError, match="Invalid text: must be a non-empty string"):
        await tool.fn(
            resume_id=str(uuid.uuid4()),
            text="",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_delete_content_rejects_missing_text(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source="one unique line",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("delete_content")
    assert tool is not None

    with pytest.raises(ToolError, match=r"Text not found\. Verify the exact text exists in the resume\."):
        await tool.fn(
            resume_id=str(resume_id),
            text="missing",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_delete_content_rejects_ambiguous_match(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source="duplicate\nvalue\nduplicate\nvalue",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("delete_content")
    assert tool is not None

    with pytest.raises(
        ToolError,
        match=r"Found 2 matches\. Provide more surrounding context for a unique match\.",
    ):
        await tool.fn(
            resume_id=str(resume_id),
            text="duplicate",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_delete_content_rejects_other_users_resume(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="other-user",
                title="Resume",
                latex_source="secret",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("delete_content")
    assert tool is not None

    with pytest.raises(ToolError, match="Resume not found"):
        await tool.fn(
            resume_id=str(resume_id),
            text="secret",
            ctx=_FakeToolContext("test-user"),
        )


@pytest.mark.asyncio
async def test_compile_resume_returns_success_for_valid_latex(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()
    latex_source = "\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}"

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source=latex_source,
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)
    compile_mock = AsyncMock(return_value=b"%PDF-1.4 fake")
    monkeypatch.setattr("app.mcp.tools.compile_latex", compile_mock)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("compile_resume")
    assert tool is not None

    result = await tool.fn(resume_id=str(resume_id), ctx=_FakeToolContext("test-user"))

    assert result == "Compilation successful. Resume compiles without errors."
    compile_mock.assert_awaited_once_with(latex_source)


@pytest.mark.asyncio
async def test_compile_resume_returns_readable_feedback_for_latex_errors(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()
    latex_source = "\\badcommand"

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Broken Resume",
                latex_source=latex_source,
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)
    compile_mock = AsyncMock(
        side_effect=CompileError(
            400,
            {
                "success": False,
                "message": "! Undefined control sequence.",
                "log": "l.3 \\\\badcommand",
            },
        )
    )
    monkeypatch.setattr("app.mcp.tools.compile_latex", compile_mock)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("compile_resume")
    assert tool is not None

    result = await tool.fn(resume_id=str(resume_id), ctx=_FakeToolContext("test-user"))

    assert result == (
        "Compilation failed.\n"
        "Message: ! Undefined control sequence.\n"
        "Log:\n"
        "l.3 \\\\badcommand"
    )
    compile_mock.assert_awaited_once_with(latex_source)


@pytest.mark.asyncio
async def test_compile_resume_raises_tool_error_when_service_is_unavailable(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="test-user",
                title="Resume",
                latex_source="\\documentclass{article}",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)
    monkeypatch.setattr(
        "app.mcp.tools.compile_latex",
        AsyncMock(side_effect=CompileServiceUnavailable()),
    )

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("compile_resume")
    assert tool is not None

    with pytest.raises(
        ToolError,
        match=r"Compilation service is currently unavailable\. Try again later\.",
    ):
        await tool.fn(resume_id=str(resume_id), ctx=_FakeToolContext("test-user"))


@pytest.mark.asyncio
async def test_compile_resume_rejects_invalid_uuid() -> None:
    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("compile_resume")
    assert tool is not None

    with pytest.raises(ToolError, match="Invalid resume_id: expected a UUID string"):
        await tool.fn(resume_id="not-a-uuid", ctx=_FakeToolContext("test-user"))


@pytest.mark.asyncio
async def test_compile_resume_rejects_other_users_resume(
    test_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    resume_id = uuid.uuid4()

    async with session_factory() as session:
        session.add(
            Resume(
                id=resume_id,
                user_id="other-user",
                title="Resume",
                latex_source="secret",
            )
        )
        await session.commit()

    @asynccontextmanager
    async def get_test_session():
        async with session_factory() as session:
            yield session

    monkeypatch.setattr("app.mcp.tools.get_session", get_test_session)

    mcp = FastMCP("test")
    register_tools(mcp)
    tool = await mcp.get_tool("compile_resume")
    assert tool is not None

    with pytest.raises(ToolError, match="Resume not found"):
        await tool.fn(resume_id=str(resume_id), ctx=_FakeToolContext("test-user"))
