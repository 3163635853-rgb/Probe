from sqlalchemy import BigInteger, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from models.base import Base, TimestampMixin


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    related_url: Mapped[Optional[str]] = mapped_column(String(512))
