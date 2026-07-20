from sqlalchemy import BigInteger, String, DateTime, Integer, SmallInteger, Text, JSON, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from typing import Optional
from models.base import Base, TimestampMixin


class InterviewSession(Base, TimestampMixin):
    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    industry_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("industries.id"))
    position_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("positions.id"))
    mode_code: Mapped[str] = mapped_column(String(16), nullable=False)
    jd_text: Mapped[Optional[str]] = mapped_column(Text)
    resume_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("resumes.id"))
    organization_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("organizations.id"))
    rubric_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("scoring_rubrics.id"))
    company_name: Mapped[Optional[str]] = mapped_column(String(128))
    interview_stage: Mapped[Optional[str]] = mapped_column(String(32))
    interviewer_role: Mapped[Optional[str]] = mapped_column(String(64))
    training_focus: Mapped[Optional[str]] = mapped_column(String(128))
    difficulty: Mapped[int] = mapped_column(SmallInteger, default=3)
    status: Mapped[str] = mapped_column(String(16), default="ongoing")
    total_rounds: Mapped[int] = mapped_column(Integer, default=0)
    final_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer)
    report_json: Mapped[Optional[dict]] = mapped_column(JSON)
    report_version: Mapped[int] = mapped_column(SmallInteger, default=1)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class InterviewRound(Base, TimestampMixin):
    __tablename__ = "interview_rounds"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("interview_sessions.id"), nullable=False)
    round_num: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    question_type: Mapped[str] = mapped_column(String(16), default="initial")
    probe_depth: Mapped[int] = mapped_column(SmallInteger, default=0)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    question_source: Mapped[str] = mapped_column(String(16), default="ai")
    knowledge_question_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    organization_question_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("organization_questions.id"))
    answer: Mapped[Optional[str]] = mapped_column(Text)
    answer_duration_sec: Mapped[Optional[int]] = mapped_column(Integer)
    skipped: Mapped[bool] = mapped_column(Boolean, default=False)
    evaluation: Mapped[Optional[dict]] = mapped_column(JSON)
    score: Mapped[Optional[int]] = mapped_column(SmallInteger)
