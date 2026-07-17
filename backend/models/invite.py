from sqlalchemy import BigInteger, Integer, String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Optional
from models.base import Base, TimestampMixin


class InviteCode(Base, TimestampMixin):
    __tablename__ = "invite_codes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    inviter_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"))
    reward_type: Mapped[str] = mapped_column(String(16), nullable=False)
    reward_value: Mapped[int] = mapped_column(Integer, nullable=False)
    max_uses: Mapped[int] = mapped_column(Integer, default=-1)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    expire_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class InviteRecord(Base, TimestampMixin):
    __tablename__ = "invite_records"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    invite_code_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("invite_codes.id"), nullable=False)
    inviter_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"))
    invitee_user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    reward_given: Mapped[bool] = mapped_column(Boolean, default=False)
    inviter_reward_given: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("invitee_user_id", name="uk_invitee"),
    )
