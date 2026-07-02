import enum
from typing import Optional

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class DemandStatus(str, enum.Enum):
    pending = "pending"
    ordered = "ordered"
    completed = "completed"
    cancelled = "cancelled"


class DemandItem(Base, IdIntPK, TimestampMixin):
    __tablename__ = "demand_items"

    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity_type: Mapped[str] = mapped_column(String(30), nullable=False, default="Unit")
    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[DemandStatus] = mapped_column(
        SAEnum(DemandStatus, name="demand_status", native_enum=False), nullable=False, default=DemandStatus.pending
    )

    supplier: Mapped["Supplier"] = relationship("Supplier", lazy="select")
    product: Mapped["Product"] = relationship("Product", lazy="select")

    @property
    def supplier_name(self) -> Optional[str]:
        return self.supplier.name if self.supplier else None

    @property
    def product_name(self) -> Optional[str]:
        return self.product.name if self.product else None
