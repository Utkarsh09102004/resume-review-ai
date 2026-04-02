from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app import database
from app.main import create_app
from app.mcp import tools as mcp_tools
from app.routes import resumes as resume_routes


@pytest.mark.asyncio
async def test_get_db_and_get_session_share_session_factory(
    monkeypatch: pytest.MonkeyPatch,
    test_engine,
) -> None:
    test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(database, "session_factory", test_session_factory)

    db_dependency = database.get_db()
    session_from_dependency = await anext(db_dependency)

    async with database.get_session() as session_from_helper:
        assert session_from_dependency.bind == session_from_helper.bind
        assert session_from_dependency.bind == test_engine

    await db_dependency.aclose()


def test_rest_and_mcp_layers_use_shared_database_helpers() -> None:
    assert resume_routes.get_db is database.get_db
    assert mcp_tools.get_session is database.get_session


@pytest.mark.asyncio
async def test_parent_lifespan_disposes_shared_engine() -> None:
    with patch("app.main.dispose_engine", new_callable=AsyncMock) as dispose_engine_mock:
        test_app = create_app()
        async with test_app.router.lifespan_context(test_app):
            pass

    dispose_engine_mock.assert_awaited_once()
