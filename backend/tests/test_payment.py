from decimal import Decimal
from types import SimpleNamespace

import pytest

from api.payment import calculate_coupon_discount


def test_percentage_coupon_discount():
    coupon = SimpleNamespace(
        coupon_type="discount",
        value=20,
        min_amount=10,
        applicable_products=["monthly", "yearly"],
    )
    assert calculate_coupon_discount(coupon, Decimal("29.00"), "monthly") == Decimal("5.80")


def test_coupon_rejects_wrong_product():
    coupon = SimpleNamespace(
        coupon_type="discount",
        value=20,
        min_amount=0,
        applicable_products=["yearly"],
    )
    with pytest.raises(ValueError, match="不适用"):
        calculate_coupon_discount(coupon, Decimal("29.00"), "monthly")


def test_coupon_rejects_non_payment_type():
    coupon = SimpleNamespace(
        coupon_type="free_quota",
        value=1,
        min_amount=0,
        applicable_products=None,
    )
    with pytest.raises(ValueError, match="不能用于购买"):
        calculate_coupon_discount(coupon, Decimal("29.00"), "monthly")
