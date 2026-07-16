from sqlalchemy import BigInteger, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Optional

from models.base import Base, FullTimestampMixin


class ShareRecord(Base, FullTimestampMixin):
    __tablename__ = "share_records"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("interview_sessions.id"), nullable=False
    )
    template: Mapped[str] = mapped_column(String(24), nullable=False)
    image_path: Mapped[str] = mapped_column(String(512), nullable=False)
    image_url: Mapped[str] = mapped_column(String(512), nullable=False)
    channel: Mapped[Optional[str]] = mapped_column(String(32))
    share_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    click_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_shared_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
