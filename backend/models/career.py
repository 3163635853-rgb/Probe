from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, FullTimestampMixin, TimestampMixin


class Resume(Base, FullTimestampMixin):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(512))
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    parsed_json: Mapped[Optional[dict]] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ExperienceStory(Base, FullTimestampMixin):
    __tablename__ = "experience_stories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    source_resume_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("resumes.id"))
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    situation: Mapped[Optional[str]] = mapped_column(Text)
    task: Mapped[Optional[str]] = mapped_column(Text)
    action: Mapped[Optional[str]] = mapped_column(Text)
    result: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[list]] = mapped_column(JSON)
    metrics: Mapped[Optional[dict]] = mapped_column(JSON)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class PracticeAttempt(Base, TimestampMixin):
    __tablename__ = "practice_attempts"
    __table_args__ = (
        UniqueConstraint("user_id", "round_id", "attempt_no", name="uk_practice_round_attempt"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    session_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("interview_sessions.id"), nullable=False)
    round_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("interview_rounds.id"), nullable=False)
    attempt_no: Mapped[int] = mapped_column(Integer, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    evaluation: Mapped[Optional[dict]] = mapped_column(JSON)
    optimized_answers: Mapped[Optional[dict]] = mapped_column(JSON)
    comparison: Mapped[Optional[dict]] = mapped_column(JSON)


class DrillAttempt(Base, FullTimestampMixin):
    __tablename__ = "drill_attempts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    drill_code: Mapped[str] = mapped_column(String(32), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer)
    position: Mapped[Optional[str]] = mapped_column(String(128))
    company_name: Mapped[Optional[str]] = mapped_column(String(128))
    focus: Mapped[Optional[str]] = mapped_column(String(128))
    evaluation: Mapped[Optional[dict]] = mapped_column(JSON)
    optimized_answers: Mapped[Optional[dict]] = mapped_column(JSON)
    comparison: Mapped[Optional[dict]] = mapped_column(JSON)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class VideoAnalysis(Base, FullTimestampMixin):
    __tablename__ = "video_analyses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    session_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("interview_sessions.id"))
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer)
    transcript: Mapped[Optional[str]] = mapped_column(Text)
    delivery_metrics: Mapped[Optional[dict]] = mapped_column(JSON)
    visual_metrics: Mapped[Optional[dict]] = mapped_column(JSON)
    overall_score: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default="completed", nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(String(512))


class CoachReview(Base, FullTimestampMixin):
    __tablename__ = "coach_reviews"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    coach_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"))
    session_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("interview_sessions.id"), nullable=False)
    video_analysis_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("video_analyses.id"))
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    focus: Mapped[Optional[str]] = mapped_column(Text)
    rating: Mapped[Optional[int]] = mapped_column(Integer)
    comments: Mapped[Optional[str]] = mapped_column(Text)
    annotations: Mapped[Optional[list]] = mapped_column(JSON)
    consent_granted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    media_access_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
