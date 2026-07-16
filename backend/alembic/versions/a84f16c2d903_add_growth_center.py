"""add growth center profiles and daily tasks

Revision ID: a84f16c2d903
Revises: 7c2d9b4f8a11
Create Date: 2026-07-16 20:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a84f16c2d903"
down_revision: Union[str, None] = "7c2d9b4f8a11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "growth_profiles",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("weekly_goal", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("last_active_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "growth_tasks",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("task_date", sa.Date(), nullable=False),
        sa.Column("task_type", sa.String(length=24), nullable=False),
        sa.Column("title", sa.String(length=96), nullable=False),
        sa.Column("description", sa.String(length=256), nullable=False),
        sa.Column("dimension", sa.String(length=32), nullable=True),
        sa.Column("target_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "task_date", "task_type", name="uk_growth_daily_task"),
    )
    op.create_index("idx_growth_task_user_date", "growth_tasks", ["user_id", "task_date"])


def downgrade() -> None:
    op.drop_index("idx_growth_task_user_date", table_name="growth_tasks")
    op.drop_table("growth_tasks")
    op.drop_table("growth_profiles")
