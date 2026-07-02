from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class Shelf(Base, IdIntPK, TimestampMixin):
    __tablename__ = "shelves"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    reference_total_batches: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    batches: Mapped[list["Batch"]] = relationship("Batch", back_populates="shelf", lazy="select")

    @property
    def total_batches(self) -> int:
        if self.reference_total_batches is not None:
            return self.reference_total_batches
        return len(self.batches)
