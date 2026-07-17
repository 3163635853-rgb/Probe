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
    # 旧逻辑只记录“双方流程完成”，无法区分邀请者是否已触达 30 次上限。
    # MySQL 8 使用窗口函数，仅把每位邀请者最早的 10 条成功记录标记为已获奖。
    op.execute(
        """
        CREATE TEMPORARY TABLE tmp_invite_reward_rank AS
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY inviter_user_id ORDER BY created_at, id
        ) AS reward_rank
        FROM invite_records
        WHERE reward_given = 1 AND inviter_user_id IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE invite_records AS ir
        JOIN tmp_invite_reward_rank AS ranked ON ranked.id = ir.id
        SET ir.inviter_reward_given = (ranked.reward_rank <= 10)
        """
    )
    op.execute("DROP TEMPORARY TABLE tmp_invite_reward_rank")
    op.execute(
        """
        DELETE newer FROM user_achievements AS newer
        JOIN user_achievements AS older
          ON newer.user_id = older.user_id
         AND newer.achievement_id = older.achievement_id
         AND newer.id > older.id
        """
    )
    op.create_unique_constraint(
        "uk_user_achievement", "user_achievements", ["user_id", "achievement_id"]
    )
    op.execute(
        """
        INSERT IGNORE INTO achievements
            (code, name, description, icon, condition_type, condition_value, reward_type, reward_value, is_active)
        VALUES
            ('first_interview', '初试啼声', '完成第一次模拟面试', 'trophy', 'interview_count', 1, 'badge', 0, 1),
            ('three_interviews', '渐入佳境', '累计完成 3 次模拟面试', 'flame', 'interview_count', 3, 'badge', 0, 1),
            ('ten_interviews', '百炼成钢', '累计完成 10 次模拟面试', 'medal', 'interview_count', 10, 'badge', 0, 1),
            ('thirty_interviews', '面试达人', '累计完成 30 次模拟面试', 'crown', 'interview_count', 30, 'badge', 0, 1),
            ('score_80', '优秀候选人', '单场面试总分达到 80 分', 'star', 'score', 80, 'badge', 0, 1),
            ('score_90', 'Offer 收割机', '单场面试总分达到 90 分', 'sparkles', 'score', 90, 'badge', 0, 1)
        """
    )


def downgrade() -> None:
    op.drop_constraint("uk_user_achievement", "user_achievements", type_="unique")
    op.drop_column("invite_records", "inviter_reward_given")
