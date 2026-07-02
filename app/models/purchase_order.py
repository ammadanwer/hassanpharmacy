import enum
from typing import Optional

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class PurchaseOrderStatus(str, enum.Enum):
    pending = "pending"
    ordered = "ordered"
    received = "received"
    cancelled = "cancelled"


class PurchaseOrder(Base, IdIntPK, TimestampMixin):
    __tablename__ = "purchase_orders"

    supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    demand_id: Mapped[Optional[int]] = mapped_column(ForeignKey("demand_items.id"), nullable=True)
    quantity_type: Mapped[str] = mapped_column(String(30), nullable=False, default="Unit")
    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[PurchaseOrderStatus] = mapped_column(
        SAEnum(PurchaseOrderStatus, name="purchase_order_status", native_enum=False),
        nullable=False,
        default=PurchaseOrderStatus.pending,
    )
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    supplier: Mapped[Optional["Supplier"]] = relationship("Supplier", lazy="select")
    product: Mapped["Product"] = relationship("Product", lazy="select")
    demand: Mapped[Optional["DemandItem"]] = relationship("DemandItem", lazy="select")

    @property
    def supplier_name(self) -> Optional[str]:
        return self.supplier.name if self.supplier else None

    @property
    def product_name(self) -> Optional[str]:
        return self.product.name if self.product else None

    @property
    def dose(self) -> Optional[str]:
        return self.product.dose if self.product else None

    @property
    def manufacturer_name(self) -> Optional[str]:
        return self.product.manufacturer_name if self.product else None

    @property
    def total_quantity(self) -> int:
        return self.product.total_quantity if self.product else 0

    @property
    def remaining_quantity(self) -> int:
        return self.product.remaining_quantity if self.product else 0
