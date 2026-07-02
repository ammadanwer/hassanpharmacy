from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class ExpenseCategory(Base, IdIntPK, TimestampMixin):
    __tablename__ = "expense_categories"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    reference_sort_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="category", lazy="select")
