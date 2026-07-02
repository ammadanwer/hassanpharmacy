from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class MedicineFormula(Base, IdIntPK, TimestampMixin):
    __tablename__ = "medicine_formulas"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reference_sort_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
