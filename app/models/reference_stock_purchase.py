from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class ReferenceStockPurchase(Base, IdIntPK, TimestampMixin):
    __tablename__ = "reference_stock_purchases"

    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    batch_no: Mapped[str] = mapped_column(String(120), nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[str] = mapped_column(String(80), nullable=False)
    rate: Mapped[str] = mapped_column(String(80), nullable=False)
    total_amount: Mapped[str] = mapped_column(String(80), nullable=False)
    extra_discount_bonus: Mapped[str] = mapped_column(String(80), nullable=False)
    purchase_date: Mapped[str] = mapped_column(String(40), nullable=False)
    stock_cost_price: Mapped[str] = mapped_column(String(80), nullable=False)
    sales_tax: Mapped[str] = mapped_column(String(80), nullable=False)
    invoice_id: Mapped[str] = mapped_column(String(120), nullable=False)
    expire_date: Mapped[str] = mapped_column(String(40), nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(255), nullable=False)
