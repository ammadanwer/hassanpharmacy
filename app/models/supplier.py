from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, Numeric, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class Supplier(Base, IdIntPK, TimestampMixin):
    __tablename__ = "suppliers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    reference_sort_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reference_total_batches: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reference_stock_purchase_price: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), nullable=True)
    reference_paid_amount: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), nullable=True)
    reference_supplier_outstanding: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), nullable=True)
    reference_payment_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    batches: Mapped[list["Batch"]] = relationship("Batch", back_populates="supplier", lazy="select")

    @property
    def total_batches(self) -> int:
        if self.reference_sort_order is not None:
            return self.reference_total_batches
        return len(self.batches)

    @property
    def stock_purchase_price(self) -> float:
        if self.reference_sort_order is not None:
            return float(self.reference_stock_purchase_price) if self.reference_stock_purchase_price is not None else None
        return float(sum(batch.total_cost if batch.total_cost is not None else (batch.purchase_price or 0) for batch in self.batches))

    @property
    def paid_amount(self) -> float:
        if self.reference_sort_order is not None:
            return float(self.reference_paid_amount) if self.reference_paid_amount is not None else None
        return float(sum(batch.paid_amount or 0 for batch in self.batches))

    @property
    def supplier_outstanding(self) -> float:
        if self.reference_sort_order is not None:
            return float(self.reference_supplier_outstanding) if self.reference_supplier_outstanding is not None else None
        return float(sum(batch.supplier_outstanding or 0 for batch in self.batches))

    @property
    def payment_status(self) -> str:
        if self.reference_payment_status:
            return self.reference_payment_status
        outstanding = self.supplier_outstanding
        paid = self.paid_amount
        if outstanding <= 0:
            return "Paid"
        if paid <= 0:
            return "Pending"
        return "Partially Paid"
