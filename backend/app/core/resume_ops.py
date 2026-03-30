import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resume import Resume


class ResumeNotFoundError(Exception):
    def __init__(self, detail: str = "Resume not found") -> None:
        super().__init__(detail)
        self.detail = detail


async def get_resume(session: AsyncSession, user_id: str, resume_id: uuid.UUID) -> Resume:
    resume = await session.get(Resume, resume_id)
    if resume is None or resume.user_id != user_id:
        raise ResumeNotFoundError()
    return resume


async def list_resumes(session: AsyncSession, user_id: str) -> Sequence[Resume]:
    result = await session.execute(select(Resume).where(Resume.user_id == user_id).order_by(Resume.updated_at.desc()))
    return result.scalars().all()


async def update_resume_latex(
    session: AsyncSession,
    user_id: str,
    resume_id: uuid.UUID,
    latex_source: str,
) -> Resume:
    resume = await get_resume(session, user_id, resume_id)
    resume.latex_source = latex_source
    await session.commit()
    await session.refresh(resume)
    return resume
