import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class UserRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    manager = "manager"
    pharmacist = "pharmacist"
    stock_manager = "stock_manager"
    technician = "technician"
    assistant = "assistant"
    intern = "intern"
    cashier = "cashier"


class User(Base, IdIntPK, TimestampMixin):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", native_enum=False), nullable=False, default=UserRole.technician
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    gender: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    sales_pin_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    permissions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # relationships
    batches_added: Mapped[list["Batch"]] = relationship("Batch", foreign_keys="Batch.added_by", back_populates="added_by_user", lazy="select")
    batches_updated: Mapped[list["Batch"]] = relationship("Batch", foreign_keys="Batch.updated_by", back_populates="updated_by_user", lazy="select")
    shifts: Mapped[list["Shift"]] = relationship("Shift", back_populates="staff", lazy="select")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="created_by_user", lazy="select")
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="user", lazy="select")

    @property
    def has_sales_pin(self) -> bool:
        return bool(self.sales_pin_hash)
