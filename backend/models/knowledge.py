from sqlalchemy import BigInteger, Integer, SmallInteger, String, Text, JSON, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from models.base import Base, TimestampMixin


class KnowledgeQuestion(Base, TimestampMixin):
    __tablename__ = "knowledge_questions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    industry_id: Mapped[int] = mapped_column(Integer, ForeignKey("industries.id"), nullable=False)
    position_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("positions.id"))
    question_type: Mapped[str] = mapped_column(String(16), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    reference_answer: Mapped[Optional[str]] = mapped_column(Text)
    scoring_criteria: Mapped[Optional[str]] = mapped_column(Text)
    difficulty: Mapped[int] = mapped_column(SmallInteger, default=3)
    tags: Mapped[Optional[dict]] = mapped_column(JSON)
    vector_id: Mapped[Optional[str]] = mapped_column(String(64))
    source: Mapped[str] = mapped_column(String(16), default="manual")
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_score: Mapped[Optional[float]] = mapped_column(Numeric(3, 1))
    status: Mapped[str] = mapped_column(String(16), default="active")
