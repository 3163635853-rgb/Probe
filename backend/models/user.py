from sqlalchemy import BigInteger, String, DateTime, Integer, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Optional
from models.base import Base, FullTimestampMixin


class User(Base, FullTimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(128), unique=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(128))
    openid: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    union_id: Mapped[Optional[str]] = mapped_column(String(64))
    nickname: Mapped[Optional[str]] = mapped_column(String(64))
    avatar: Mapped[Optional[str]] = mapped_column(String(512))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    membership_type: Mapped[str] = mapped_column(String(16), default="free")
    membership_expire_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    total_interviews: Mapped[int] = mapped_column(Integer, default=0)
    weak_points: Mapped[Optional[dict]] = mapped_column(JSON)
    push_token: Mapped[Optional[str]] = mapped_column(String(256))
    device_id: Mapped[Optional[str]] = mapped_column(String(64))
    platform: Mapped[Optional[str]] = mapped_column(String(16))
    is_coach: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
