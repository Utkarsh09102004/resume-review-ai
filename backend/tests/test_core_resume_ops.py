import uuid
from datetime import UTC, datetime

import pytest

from app.core.resume_ops import ResumeNotFoundError, apply_resume_updates, get_resume, list_resumes
from app.models.resume import Resume


@pytest.mark.asyncio
async def test_list_resumes_returns_owned_only(test_session) -> None:
    older_resume_id = uuid.uuid4()
    newer_resume_id = uuid.uuid4()

    test_session.add_all(
        [
            Resume(
                id=older_resume_id,
                user_id="test-user",
                title="Older Resume",
                latex_source="older",
                updated_at=datetime(2026, 3, 25, tzinfo=UTC),
            ),
            Resume(
                id=newer_resume_id,
                user_id="test-user",
                title="Newer Resume",
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
    await test_session.commit()

    resumes = await list_resumes(test_session, "test-user")

    assert [resume.id for resume in resumes] == [newer_resume_id, older_resume_id]


@pytest.mark.asyncio
async def test_get_resume_success(test_session) -> None:
    resume_id = uuid.uuid4()
    resume = Resume(
        id=resume_id,
        user_id="test-user",
        title="Resume",
        latex_source="hello",
    )
    test_session.add(resume)
    await test_session.commit()

    loaded = await get_resume(test_session, "test-user", resume_id)

    assert loaded.id == resume_id
    assert loaded.user_id == "test-user"


@pytest.mark.asyncio
async def test_get_resume_not_found(test_session) -> None:
    with pytest.raises(ResumeNotFoundError, match="Resume not found"):
        await get_resume(test_session, "test-user", uuid.uuid4())


@pytest.mark.asyncio
async def test_get_resume_wrong_owner(test_session) -> None:
    resume_id = uuid.uuid4()
    test_session.add(
        Resume(
            id=resume_id,
            user_id="other-user",
            title="Private Resume",
            latex_source="secret",
        )
    )
    await test_session.commit()

    with pytest.raises(ResumeNotFoundError, match="Resume not found"):
        await get_resume(test_session, "test-user", resume_id)


@pytest.mark.asyncio
async def test_apply_resume_updates(test_session) -> None:
    resume_id = uuid.uuid4()
    test_session.add(
        Resume(
            id=resume_id,
            user_id="test-user",
            title="Resume",
            latex_source="old source",
        )
    )
    await test_session.commit()

    updated = await apply_resume_updates(
        test_session,
        "test-user",
        resume_id,
        title="Updated Resume",
        latex_source="new source",
    )

    assert updated.title == "Updated Resume"
    assert updated.latex_source == "new source"

    saved = await get_resume(test_session, "test-user", resume_id)
    assert saved.title == "Updated Resume"
    assert saved.latex_source == "new source"
