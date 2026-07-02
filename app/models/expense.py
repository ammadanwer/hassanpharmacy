from datetime import date, datetime
from typing import Optional

from sqlalchemy import Numeric, String, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class Expense(Base, IdIntPK, TimestampMixin):
    __tablename__ = "expenses"

    date: Mapped[date] = mapped_column(Date, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    expense_category_id: Mapped[int] = mapped_column(ForeignKey("expense_categories.id"), nullable=False)
    expense_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    category: Mapped["ExpenseCategory"] = relationship("ExpenseCategory", back_populates="expenses", lazy="select")
    created_by_user: Mapped["User"] = relationship("User", back_populates="expenses", lazy="select")

    @property
    def expense_category_name(self) -> Optional[str]:
        return self.category.name if self.category else None
