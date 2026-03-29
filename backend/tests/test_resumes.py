import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.database import get_db
from app.main import app
from app.middleware.auth import get_current_user
from app.schemas.resume import DEFAULT_LATEX_TEMPLATE


@pytest.mark.asyncio
async def test_create_resume_default_template(client: AsyncClient) -> None:
    resp = await client.post("/api/resumes/", json={"title": "My Resume"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "My Resume"
    assert data["latex_source"] == DEFAULT_LATEX_TEMPLATE
    assert data["user_id"] == "test-user"
    assert data["parent_id"] is None


@pytest.mark.asyncio
async def test_create_resume_custom_latex(client: AsyncClient) -> None:
    custom_latex = r"\documentclass{article}\begin{document}Hello\end{document}"
    resp = await client.post(
        "/api/resumes/",
        json={"title": "Custom", "latex_source": custom_latex},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["latex_source"] == custom_latex


@pytest.mark.asyncio
async def test_create_sub_resume_copies_parent(client: AsyncClient) -> None:
    # Create parent
    parent_resp = await client.post(
        "/api/resumes/",
        json={"title": "Parent", "latex_source": r"\documentclass{article}\begin{document}Parent\end{document}"},
    )
    assert parent_resp.status_code == 201
    parent_id = parent_resp.json()["id"]
    parent_latex = parent_resp.json()["latex_source"]

    # Create sub-resume referencing parent
    child_resp = await client.post(
        "/api/resumes/",
        json={"title": "Child", "parent_id": parent_id},
    )
    assert child_resp.status_code == 201
    child_data = child_resp.json()
    assert child_data["parent_id"] == parent_id
    assert child_data["latex_source"] == parent_latex


@pytest.mark.asyncio
async def test_create_sub_resume_nonexistent_parent(client: AsyncClient) -> None:
    bogus_id = str(uuid.uuid4())
    resp = await client.post(
        "/api/resumes/",
        json={"title": "Orphan", "parent_id": bogus_id},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_sub_resume_other_users_parent(client: AsyncClient, test_engine) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    # Temporarily switch to "other-user" to create a resume
    async def override_other_user() -> str:
        return "other-user"

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_current_user] = override_other_user
    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as other_client:
        other_resp = await other_client.post(
            "/api/resumes/",
            json={"title": "Other's Resume"},
        )
        assert other_resp.status_code == 201
        other_id = other_resp.json()["id"]

    # Switch back to "test-user"
    async def override_test_user() -> str:
        return "test-user"

    app.dependency_overrides[get_current_user] = override_test_user

    # Try to fork the other user's resume
    resp = await client.post(
        "/api/resumes/",
        json={"title": "Forked", "parent_id": other_id},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_resume_empty_title(client: AsyncClient) -> None:
    resp = await client.post("/api/resumes/", json={"title": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_resume_null_title(client: AsyncClient) -> None:
    create_resp = await client.post("/api/resumes/", json={"title": "Valid"})
    resume_id = create_resp.json()["id"]

    resp = await client.put(f"/api/resumes/{resume_id}", json={"title": None})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_resume_empty_title(client: AsyncClient) -> None:
    create_resp = await client.post("/api/resumes/", json={"title": "Valid"})
    resume_id = create_resp.json()["id"]

    resp = await client.put(f"/api/resumes/{resume_id}", json={"title": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_resumes(client: AsyncClient) -> None:
    resp1 = await client.post("/api/resumes/", json={"title": "First"})
    assert resp1.status_code == 201

    resp2 = await client.post("/api/resumes/", json={"title": "Second"})
    assert resp2.status_code == 201

    resp = await client.get("/api/resumes/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    # Both resumes present; ordered by updated_at desc
    # (SQLite has second-level timestamp precision, so items created in
    # the same second may appear in either order.)
    titles = {item["title"] for item in data}
    assert titles == {"First", "Second"}


@pytest.mark.asyncio
async def test_list_resumes_isolation(client: AsyncClient, test_engine) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    # Create a resume as test-user
    await client.post("/api/resumes/", json={"title": "My Resume"})

    # Create a resume as other-user
    async def override_other_user() -> str:
        return "other-user"

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_current_user] = override_other_user
    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as other_client:
        await other_client.post("/api/resumes/", json={"title": "Other Resume"})

    # Switch back and verify test-user only sees their own resume
    async def override_test_user() -> str:
        return "test-user"

    app.dependency_overrides[get_current_user] = override_test_user

    resp = await client.get("/api/resumes/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "My Resume"


@pytest.mark.asyncio
async def test_get_resume(client: AsyncClient) -> None:
    create_resp = await client.post("/api/resumes/", json={"title": "Fetch Me"})
    resume_id = create_resp.json()["id"]

    resp = await client.get(f"/api/resumes/{resume_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Fetch Me"
    assert data["id"] == resume_id


@pytest.mark.asyncio
async def test_get_resume_not_found(client: AsyncClient) -> None:
    random_id = str(uuid.uuid4())
    resp = await client.get(f"/api/resumes/{random_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_resume_other_user(client: AsyncClient, test_engine) -> None:
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    # Create a resume as other-user
    async def override_other_user() -> str:
        return "other-user"

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_current_user] = override_other_user
    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as other_client:
        other_resp = await other_client.post(
            "/api/resumes/",
            json={"title": "Private Resume"},
        )
        other_id = other_resp.json()["id"]

    # Switch back to test-user and try to access it
    async def override_test_user() -> str:
        return "test-user"

    app.dependency_overrides[get_current_user] = override_test_user

    resp = await client.get(f"/api/resumes/{other_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_resume(client: AsyncClient) -> None:
    create_resp = await client.post("/api/resumes/", json={"title": "Old Title"})
    resume_id = create_resp.json()["id"]

    resp = await client.put(f"/api/resumes/{resume_id}", json={"title": "New Title"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_delete_resume(client: AsyncClient) -> None:
    create_resp = await client.post("/api/resumes/", json={"title": "Delete Me"})
    resume_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/resumes/{resume_id}")
    assert resp.status_code == 204

    # Verify it's gone
    get_resp = await client.get(f"/api/resumes/{resume_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_cascades_sub_resumes(client: AsyncClient) -> None:
    # Create parent
    parent_resp = await client.post("/api/resumes/", json={"title": "Parent"})
    parent_id = parent_resp.json()["id"]

    # Create child referencing parent
    child_resp = await client.post(
        "/api/resumes/",
        json={"title": "Child", "parent_id": parent_id},
    )
    child_id = child_resp.json()["id"]

    # Delete parent
    del_resp = await client.delete(f"/api/resumes/{parent_id}")
    assert del_resp.status_code == 204

    # Verify child is also gone (cascade)
    get_resp = await client.get(f"/api/resumes/{child_id}")
    assert get_resp.status_code == 404
