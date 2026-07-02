from datetime import date
from typing import Optional

from sqlalchemy import Date, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class ReferenceProductSaleInvoice(Base, IdIntPK, TimestampMixin):
    __tablename__ = "reference_product_sale_invoices"

    product_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    dose: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    generic_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    discount_percent: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_payable: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    paid: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    due: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    change_returned: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
