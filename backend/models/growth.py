from datetime import date, datetime
from typing import Optional

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, FullTimestampMixin


class GrowthProfile(Base, FullTimestampMixin):
    __tablename__ = "growth_profiles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), unique=True, nullable=False
    )
    xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    weekly_goal: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    last_active_date: Mapped[Optional[date]] = mapped_column(Date)


class GrowthTask(Base, FullTimestampMixin):
    __tablename__ = "growth_tasks"
    __table_args__ = (
        UniqueConstraint("user_id", "task_date", "task_type", name="uk_growth_daily_task"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    task_date: Mapped[date] = mapped_column(Date, nullable=False)
    task_type: Mapped[str] = mapped_column(String(24), nullable=False)
    title: Mapped[str] = mapped_column(String(96), nullable=False)
    description: Mapped[str] = mapped_column(String(256), nullable=False)
    dimension: Mapped[Optional[str]] = mapped_column(String(32))
    target_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
