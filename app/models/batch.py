import enum
from datetime import date, datetime
from typing import Optional

from sqlalchemy import String, Enum as SAEnum, ForeignKey, Numeric, Integer, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class BatchStatus(str, enum.Enum):
    active = "active"
    reported = "reported"


class Batch(Base, IdIntPK, TimestampMixin):
    __tablename__ = "batches"

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    batch_no: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    shelf_id: Mapped[Optional[int]] = mapped_column(ForeignKey("shelves.id"), nullable=True)
    stock_in: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stock_out: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stock_remaining: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    purchase_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    purchase_price_before_tax: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    sell_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    cost_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    total_cost: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), nullable=True)
    production_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expire_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    paid_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    supplier_outstanding: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    supplier_invoice_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    product_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    reference_batch_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reference_sort_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reference_created_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    reference_sell_price_display: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference_cost_price_display: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    box_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    units_per_box: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cost_price_per_box: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    boxes_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    stock_purchase_price_before_discount: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), nullable=True)
    discount_percentage: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    batch_discount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    tax_percentage: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    tax_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    purchasing_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    max_discount_percentage: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    batch_purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_reminder: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stock_out_reminder: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[BatchStatus] = mapped_column(
        SAEnum(BatchStatus, name="batch_status", native_enum=False), nullable=False, default=BatchStatus.active
    )
    added_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    product: Mapped["Product"] = relationship("Product", back_populates="batches", lazy="select")
    supplier: Mapped[Optional["Supplier"]] = relationship("Supplier", back_populates="batches", lazy="select")
    shelf: Mapped[Optional["Shelf"]] = relationship("Shelf", back_populates="batches", lazy="select")
    sale_items: Mapped[list["SaleItem"]] = relationship("SaleItem", back_populates="batch", lazy="select")
    returns: Mapped[list["Return"]] = relationship("Return", back_populates="batch", lazy="select")
    added_by_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[added_by], back_populates="batches_added", lazy="select")
    updated_by_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[updated_by], back_populates="batches_updated", lazy="select")

    @property
    def product_name(self) -> Optional[str]:
        return self.product.name if self.product else None

    @property
    def shelf_name(self) -> Optional[str]:
        return self.shelf.name if self.shelf else None

    @property
    def supplier_name(self) -> Optional[str]:
        return self.supplier.name if self.supplier else None

    @property
    def added_by_name(self) -> Optional[str]:
        return self.added_by_user.name if self.added_by_user else None

    @property
    def updated_by_name(self) -> Optional[str]:
        return self.updated_by_user.name if self.updated_by_user else None

    @property
    def medicine_formula(self) -> Optional[str]:
        if not self.product:
            return None
        return self.product.formula_name
