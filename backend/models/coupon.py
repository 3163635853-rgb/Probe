from sqlalchemy import BigInteger, Integer, String, DateTime, Boolean, JSON, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Optional
from models.base import Base, TimestampMixin


class Coupon(Base, TimestampMixin):
    __tablename__ = "coupons"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    coupon_type: Mapped[str] = mapped_column(String(16), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    min_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    applicable_products: Mapped[Optional[dict]] = mapped_column(JSON)
    total_stock: Mapped[int] = mapped_column(Integer, default=-1)
    issued_count: Mapped[int] = mapped_column(Integer, default=0)
    start_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    expire_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class UserCoupon(Base, TimestampMixin):
    __tablename__ = "user_coupons"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    coupon_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("coupons.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="unused")
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    used_payment_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    expire_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
