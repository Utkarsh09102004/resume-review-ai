import uuid
from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.resume import Resume
from app.schemas.resume import DEFAULT_LATEX_TEMPLATE, ResumeCreate, ResumeResponse, ResumeUpdate

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.get("/", response_model=list[ResumeResponse])
async def list_resumes(
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Sequence[Resume]:
    result = await session.execute(select(Resume).where(Resume.user_id == user_id).order_by(Resume.updated_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def create_resume(
    body: ResumeCreate,
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Resume:
    if body.parent_id is not None:
        if body.latex_source is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot provide latex_source when forking from a parent resume",
            )
        parent = await session.get(Resume, body.parent_id)
        if parent is None or parent.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent resume not found",
            )
        latex_source = parent.latex_source
    else:
        latex_source = body.latex_source or DEFAULT_LATEX_TEMPLATE

    resume = Resume(
        user_id=user_id,
        parent_id=body.parent_id,
        title=body.title,
        latex_source=latex_source,
    )
    session.add(resume)
    await session.commit()
    await session.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: uuid.UUID,
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Resume:
    resume = await session.get(Resume, resume_id)
    if resume is None or resume.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    return resume


@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: uuid.UUID,
    body: ResumeUpdate,
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Resume:
    resume = await session.get(Resume, resume_id)
    if resume is None or resume.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resume, field, value)

    await session.commit()
    await session.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: uuid.UUID,
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> None:
    resume = await session.get(Resume, resume_id)
    if resume is None or resume.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    await session.delete(resume)
    await session.commit()
