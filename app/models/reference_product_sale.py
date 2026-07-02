from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class ReferenceProductSale(Base, IdIntPK, TimestampMixin):
    __tablename__ = "reference_product_sales"

    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dose: Mapped[str | None] = mapped_column(String(120), nullable=True)
    generic_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sold_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
