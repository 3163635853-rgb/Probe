"""add share records and payment fulfillment fields

Revision ID: 7c2d9b4f8a11
Revises: 5a7396baf645
Create Date: 2026-07-16 18:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "7c2d9b4f8a11"
down_revision: Union[str, None] = "5a7396baf645"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("expires_at", sa.DateTime(), nullable=True))
    op.add_column("payments", sa.Column("fulfilled_at", sa.DateTime(), nullable=True))
    op.create_table(
        "share_records",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("uuid", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("session_id", sa.BigInteger(), nullable=False),
        sa.Column("template", sa.String(length=24), nullable=False),
        sa.Column("image_path", sa.String(length=512), nullable=False),
        sa.Column("image_url", sa.String(length=512), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=True),
        sa.Column("share_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("click_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_shared_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index("idx_share_user", "share_records", ["user_id"])
    op.create_index("idx_share_session", "share_records", ["session_id"])


def downgrade() -> None:
    op.drop_index("idx_share_session", table_name="share_records")
    op.drop_index("idx_share_user", table_name="share_records")
    op.drop_table("share_records")
    op.drop_column("payments", "fulfilled_at")
    op.drop_column("payments", "expires_at")
