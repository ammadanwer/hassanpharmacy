from datetime import date
from typing import Optional

from sqlalchemy import Numeric, String, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class Return(Base, IdIntPK, TimestampMixin):
    __tablename__ = "returns"

    return_invoice_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"), nullable=False)
    qty_sold: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    qty_returned: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    refund_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)

    sale: Mapped["Sale"] = relationship("Sale", back_populates="returns", lazy="select")
    batch: Mapped["Batch"] = relationship("Batch", back_populates="returns", lazy="select")

    @property
    def invoice_number(self) -> Optional[str]:
        return self.sale.invoice_number if self.sale else None

    @property
    def customer_name(self) -> Optional[str]:
        return self.sale.customer_name if self.sale else None

    @property
    def batch_no(self) -> Optional[str]:
        return self.batch.batch_no if self.batch else None

    @property
    def product_name(self) -> Optional[str]:
        return self.batch.product.name if self.batch and self.batch.product else None

    @property
    def total_amount(self) -> float:
        return float(self.amount or 0)
