from sqlalchemy import BigInteger, Integer, String, DateTime, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Optional
from models.base import Base, TimestampMixin, FullTimestampMixin


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    order_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    wx_transaction_id: Mapped[Optional[str]] = mapped_column(String(64))
    product_type: Mapped[str] = mapped_column(String(16), nullable=False)
    original_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    pay_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    coupon_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    refund_reason: Mapped[Optional[str]] = mapped_column(String(256))
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    fulfilled_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class Subscription(Base, FullTimestampMixin):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    plan: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active")
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expire_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=False)
