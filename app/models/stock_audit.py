import enum

from sqlalchemy import Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class StockAuditMode(str, enum.Enum):
    increase = "Increase"
    decrease = "Decrease"


class StockAudit(Base, IdIntPK, TimestampMixin):
    __tablename__ = "stock_audits"

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"), nullable=False)
    quantity_type: Mapped[str] = mapped_column(String(30), nullable=False, default="Tablet")
    quantity_before: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    quantity_adjusted: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    quantity_after: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    adjustment_type: Mapped[StockAuditMode] = mapped_column(
        SAEnum(StockAuditMode, name="stock_audit_mode", native_enum=False), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    product: Mapped["Product"] = relationship("Product", lazy="select")
    batch: Mapped["Batch"] = relationship("Batch", lazy="select")
    user: Mapped["User"] = relationship("User", lazy="select")
