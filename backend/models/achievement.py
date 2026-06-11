from sqlalchemy import BigInteger, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from typing import Optional
from models.base import Base, TimestampMixin


class Achievement(Base, TimestampMixin):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(256))
    icon: Mapped[Optional[str]] = mapped_column(String(256))
    condition_type: Mapped[str] = mapped_column(String(16), nullable=False)
    condition_value: Mapped[int] = mapped_column(Integer, nullable=False)
    reward_type: Mapped[str] = mapped_column(String(16), default="badge")
    reward_value: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    achievement_id: Mapped[int] = mapped_column(Integer, ForeignKey("achievements.id"), nullable=False)
    achieved_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
