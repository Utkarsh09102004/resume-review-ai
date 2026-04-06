import uuid
from collections.abc import Sequence
from typing import Final, cast

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resume import Resume


class ResumeNotFoundError(Exception):
    def __init__(self, detail: str = "Resume not found") -> None:
        super().__init__(detail)
        self.detail = detail


class ResumeVersionConflictError(Exception):
    def __init__(self, detail: str = "Resume version conflict") -> None:
        super().__init__(detail)
        self.detail = detail


UNSET: Final = object()


async def get_resume(session: AsyncSession, user_id: str, resume_id: uuid.UUID) -> Resume:
    resume = await session.get(Resume, resume_id)
    if resume is None or resume.user_id != user_id:
        raise ResumeNotFoundError()
    return resume


async def list_resumes(session: AsyncSession, user_id: str) -> Sequence[Resume]:
    result = await session.execute(select(Resume).where(Resume.user_id == user_id).order_by(Resume.updated_at.desc()))
    return result.scalars().all()


async def apply_resume_updates(
    session: AsyncSession,
    user_id: str,
    resume_id: uuid.UUID,
    *,
    title: str | object = UNSET,
    latex_source: str | object = UNSET,
    expected_version: int | None = None,
) -> Resume:
    values: dict[str, object] = {}

    if title is not UNSET:
        values["title"] = cast(str, title)
    if latex_source is not UNSET:
        values["latex_source"] = cast(str, latex_source)

    if not values:
        return await get_resume(session, user_id, resume_id)

    values["updated_at"] = func.now()
    if latex_source is not UNSET:
        values["version"] = Resume.version + 1

    statement = (
        update(Resume)
        .where(
            Resume.id == resume_id,
            Resume.user_id == user_id,
        )
        .values(**values)
        .returning(Resume.id)
    )
    if expected_version is not None:
        statement = statement.where(Resume.version == expected_version)

    result = await session.execute(statement)
    updated_resume_id = result.scalar_one_or_none()

    if updated_resume_id is None:
        try:
            await get_resume(session, user_id, resume_id)
        except ResumeNotFoundError:
            raise

        raise ResumeVersionConflictError()

    await session.commit()
    return await get_resume(session, user_id, resume_id)
