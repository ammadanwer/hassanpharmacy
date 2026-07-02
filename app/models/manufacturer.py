from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class Manufacturer(Base, IdIntPK, TimestampMixin):
    __tablename__ = "manufacturers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference_sort_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
