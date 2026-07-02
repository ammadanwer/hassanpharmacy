from typing import Optional

from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class Customer(Base, IdIntPK, TimestampMixin):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    due_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
