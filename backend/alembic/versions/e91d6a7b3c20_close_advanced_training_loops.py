"""close advanced training loops

Revision ID: e91d6a7b3c20
Revises: c42f91a7e6d4
Create Date: 2026-07-20 18:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e91d6a7b3c20"
down_revision: Union[str, None] = "c42f91a7e6d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "drill_attempts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("uuid", sa.String(36), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("drill_code", sa.String(32), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("duration_sec", sa.Integer(), nullable=True),
        sa.Column("position", sa.String(128), nullable=True),
        sa.Column("company_name", sa.String(128), nullable=True),
        sa.Column("focus", sa.String(128), nullable=True),
        sa.Column("evaluation", sa.JSON(), nullable=True),
        sa.Column("optimized_answers", sa.JSON(), nullable=True),
        sa.Column("comparison", sa.JSON(), nullable=True),
        sa.Column("xp_awarded", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index("idx_drill_attempt_user", "drill_attempts", ["user_id", "created_at"])
    op.add_column("coach_reviews", sa.Column("video_analysis_id", sa.BigInteger(), nullable=True))
    op.add_column("coach_reviews", sa.Column("consent_granted_at", sa.DateTime(), nullable=True))
    op.add_column("coach_reviews", sa.Column("media_access_expires_at", sa.DateTime(), nullable=True))
    op.create_foreign_key("fk_coach_review_video", "coach_reviews", "video_analyses", ["video_analysis_id"], ["id"])
    op.add_column("interview_rounds", sa.Column("organization_question_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key("fk_round_org_question", "interview_rounds", "organization_questions", ["organization_question_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_round_org_question", "interview_rounds", type_="foreignkey")
    op.drop_column("interview_rounds", "organization_question_id")
    op.drop_constraint("fk_coach_review_video", "coach_reviews", type_="foreignkey")
    op.drop_column("coach_reviews", "media_access_expires_at")
    op.drop_column("coach_reviews", "consent_granted_at")
    op.drop_column("coach_reviews", "video_analysis_id")
    op.drop_index("idx_drill_attempt_user", table_name="drill_attempts")
    op.drop_table("drill_attempts")
