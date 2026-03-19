"""create resumes table

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "resumes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column(
            "parent_id",
            UUID(as_uuid=True),
            sa.ForeignKey("resumes.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("latex_source", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("resumes")
