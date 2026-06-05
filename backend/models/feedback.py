from sqlalchemy import BigInteger, SmallInteger, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from models.base import Base, TimestampMixin


class Feedback(Base, TimestampMixin):
    __tablename__ = "feedbacks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    session_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("interview_sessions.id"))
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text)
    feedback_type: Mapped[str] = mapped_column(String(16), default="interview")
