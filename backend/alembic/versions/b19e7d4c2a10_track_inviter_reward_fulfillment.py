"""track inviter-side reward fulfillment

Revision ID: b19e7d4c2a10
Revises: a84f16c2d903
Create Date: 2026-07-17 17:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b19e7d4c2a10"
down_revision: Union[str, None] = "a84f16c2d903"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "invite_records",
        sa.Column("inviter_reward_given", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute(
        "UPDATE invite_records SET inviter_reward_given = reward_given "
        "WHERE inviter_user_id IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_column("invite_records", "inviter_reward_given")
