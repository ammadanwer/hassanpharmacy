from typing import Optional

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import IdIntPK, TimestampMixin
from app.db.session import Base


class PharmacyProfile(Base, IdIntPK, TimestampMixin):
    __tablename__ = "pharmacy_profiles"

    name: Mapped[str] = mapped_column(String(255), nullable=False, default="Hassan Pharmacy")
    customer_service: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="03324122333")
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="Pakistan")
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="Karachi")
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, default="DHA phase 2 extension")
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default="haseebkiani44@gmail.com")
    reg_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="121122")
    license_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="1")
    license_expiry: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="30/11/2028")
    operating_hours: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="10am-6pm")
    pin_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    logo_data_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
