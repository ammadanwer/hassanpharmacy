from typing import Optional

from sqlalchemy import Numeric, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK


class SaleItem(Base, IdIntPK):
    __tablename__ = "sale_items"

    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    batch_no: Mapped[str] = mapped_column(String(100), nullable=False)
    sale_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    qt_in_box: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    qt_in_units: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_qty: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    cost_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    discount_percent: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    discount_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    payable_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    reference_qty_returned: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    reference_receipt_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference_qt_in_box_display: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    sale: Mapped["Sale"] = relationship("Sale", back_populates="items", lazy="select")
    product: Mapped["Product"] = relationship("Product", lazy="select")
    batch: Mapped["Batch"] = relationship("Batch", back_populates="sale_items", lazy="select")

    @property
    def qty_returned(self) -> float:
        actual_returned = 0
        if self.sale:
            actual_returned = sum(float(row.qty_returned or 0) for row in self.sale.returns if row.batch_id == self.batch_id)
        if self.reference_qty_returned is not None:
            return float(self.reference_qty_returned) + actual_returned
        return actual_returned

    @property
    def product_weight(self) -> Optional[str]:
        return self.product.weight if self.product is not None else None

    @property
    def product_unit(self) -> Optional[str]:
        return self.product.unit if self.product is not None else None
