import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class CategoryType(str, enum.Enum):
    medical = "medical"
    non_medical = "non-medical"


class Category(Base, IdIntPK, TimestampMixin):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    reference_sort_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    type: Mapped[CategoryType] = mapped_column(
        SAEnum(CategoryType, name="category_type", native_enum=False), nullable=False, default=CategoryType.medical
    )

    products: Mapped[list["Product"]] = relationship("Product", back_populates="category", lazy="select")
