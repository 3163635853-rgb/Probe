from sqlalchemy import Integer, SmallInteger, String, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from models.base import Base, TimestampMixin


class Industry(Base, TimestampMixin):
    __tablename__ = "industries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(256))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[Optional[str]] = mapped_column(String(256))


class Position(Base, TimestampMixin):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    industry_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(16), nullable=False)
    level: Mapped[str] = mapped_column(String(16), default="mid")
    icon: Mapped[Optional[str]] = mapped_column(String(256))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    default_difficulty: Mapped[int] = mapped_column(SmallInteger, default=3)
    default_mode: Mapped[str] = mapped_column(String(16), default="mixed")
    description: Mapped[Optional[str]] = mapped_column(String(256))


class InterviewMode(Base, TimestampMixin):
    __tablename__ = "interview_modes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(256))
    icon: Mapped[Optional[str]] = mapped_column(String(256))
    applicable_categories: Mapped[Optional[list]] = mapped_column(JSON)
    default_rounds: Mapped[int] = mapped_column(SmallInteger, default=10)
    default_duration_min: Mapped[int] = mapped_column(SmallInteger, default=30)
    dimension_weights: Mapped[Optional[dict]] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class DifficultyConfig(Base, TimestampMixin):
    __tablename__ = "difficulty_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    level: Mapped[int] = mapped_column(SmallInteger, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(128))
    question_complexity: Mapped[Optional[str]] = mapped_column(String(128))
    expected_answer_depth: Mapped[Optional[str]] = mapped_column(String(256))
    probe_aggressiveness: Mapped[str] = mapped_column(String(8), default="medium")
