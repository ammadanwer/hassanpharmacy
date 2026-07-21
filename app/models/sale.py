import enum
from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import (
    String, Numeric, Enum as SAEnum, ForeignKey, Date, Time, DateTime, Boolean
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card_payment"
    easy_paisa = "easy_paisa"
    jazz_cash = "jazz_cash"
    bank_transfer = "bank_transfer"


class SaleStatus(str, enum.Enum):
    draft = "draft"
    paid = "paid"
    partial = "partial"
    void = "void"
    returned = "returned"


class Sale(Base, IdIntPK, TimestampMixin):
    __tablename__ = "sales"

    invoice_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    customer_id: Mapped[Optional[int]] = mapped_column(nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    doctor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    time: Mapped[time] = mapped_column(Time, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    discount_percent: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    discount_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 3), nullable=True)
    total_payable: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    paid: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    due: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    change_returned: Mapped[Optional[float]] = mapped_column(Numeric(12, 3), nullable=True)
    reference_cost_amount: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), nullable=True)
    reference_original_total_amount: Mapped[Optional[float]] = mapped_column(Numeric(14, 3), nullable=True)
    reference_original_discount_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 3), nullable=True)
    reference_original_total_payable: Mapped[Optional[float]] = mapped_column(Numeric(14, 3), nullable=True)
    reference_original_paid: Mapped[Optional[float]] = mapped_column(Numeric(12, 3), nullable=True)
    reference_original_due: Mapped[Optional[float]] = mapped_column(Numeric(12, 3), nullable=True)
    reference_original_due_display: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_original_change_returned: Mapped[Optional[float]] = mapped_column(Numeric(12, 3), nullable=True)
    reference_return_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    reference_return_discount_percent: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    reference_return_discount_percent_visible: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    reference_return_discount_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    reference_after_return_total_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    reference_after_return_net_paid: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    reference_total_amount_display: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    reference_discount_percent_display: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    reference_discount_amount_display: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    reference_total_payable_display: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    reference_paid_display: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    reference_due_display: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    reference_change_returned_display: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    payment_method: Mapped[Optional[PaymentMethod]] = mapped_column(
        SAEnum(PaymentMethod, name="payment_method", native_enum=False), nullable=True
    )
    status: Mapped[SaleStatus] = mapped_column(
        SAEnum(SaleStatus, name="sale_status", native_enum=False), nullable=False, default=SaleStatus.draft
    )

    user: Mapped["User"] = relationship("User", back_populates="sales", lazy="select")
    items: Mapped[list["SaleItem"]] = relationship("SaleItem", back_populates="sale", lazy="select", cascade="all, delete-orphan")
    returns: Mapped[list["Return"]] = relationship("Return", back_populates="sale", lazy="select")

    @property
    def local_return_amount(self) -> float:
        return sum(float(row.amount or 0) for row in self.returns)
