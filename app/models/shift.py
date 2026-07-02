from datetime import date, time, datetime
from typing import Optional

from sqlalchemy import String, Date, Time, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class Shift(Base, IdIntPK, TimestampMixin):
    __tablename__ = "shifts"

    staff_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    shift_type: Mapped[str] = mapped_column(String(100), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    start_period: Mapped[str] = mapped_column(String(2), nullable=False, default="AM")
    end_period: Mapped[str] = mapped_column(String(2), nullable=False, default="AM")
    off_days: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    staff: Mapped["User"] = relationship("User", back_populates="shifts", lazy="select")

    @property
    def staff_name(self) -> Optional[str]:
        return self.staff.name if self.staff else None
