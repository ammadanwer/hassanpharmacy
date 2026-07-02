import enum
from typing import Optional

from sqlalchemy import Boolean, Integer, String, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import IdIntPK, TimestampMixin


class ProductType(str, enum.Enum):
    medical = "medical"
    non_medical = "non-medical"


class Product(Base, IdIntPK, TimestampMixin):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    barcode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    brand_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    formula_id: Mapped[Optional[int]] = mapped_column(ForeignKey("medicine_formulas.id"), nullable=True)
    manufacturer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("manufacturers.id"), nullable=True)
    dose: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    weight: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    generic_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    medicine_formula: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    prescription_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    local_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    reference_sort_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reference_formula_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference_brand_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference_category_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference_manufacturer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference_generic_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reference_total_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reference_remaining_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    type: Mapped[ProductType] = mapped_column(
        SAEnum(ProductType, name="product_type", native_enum=False), nullable=False, default=ProductType.medical
    )

    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="products", lazy="select", foreign_keys=[category_id])
    formula: Mapped[Optional["MedicineFormula"]] = relationship("MedicineFormula", lazy="select", foreign_keys=[formula_id])
    manufacturer: Mapped[Optional["Manufacturer"]] = relationship("Manufacturer", lazy="select", foreign_keys=[manufacturer_id])
    batches: Mapped[list["Batch"]] = relationship("Batch", back_populates="product", lazy="select")
    sale_items: Mapped[list["SaleItem"]] = relationship("SaleItem", back_populates="product", lazy="select")

    @property
    def display_generic_name(self) -> Optional[str]:
        if self.reference_sort_order is not None:
            return self.reference_generic_name
        return self.generic_name

    @property
    def category_name(self) -> Optional[str]:
        if self.reference_sort_order is not None:
            return self.reference_category_name
        return self.category.name if self.category else None

    @property
    def formula_name(self) -> Optional[str]:
        if self.reference_sort_order is not None:
            return self.reference_formula_name
        return self.formula.name if self.formula else self.medicine_formula

    @property
    def manufacturer_name(self) -> Optional[str]:
        if self.reference_sort_order is not None:
            return self.reference_manufacturer_name or self.reference_brand_name
        return self.manufacturer.name if self.manufacturer else None

    @property
    def total_quantity(self) -> int:
        if self.reference_sort_order is not None and self.reference_total_quantity is not None:
            return self.reference_total_quantity
        return sum(int(batch.stock_in or 0) for batch in self.batches if getattr(batch, "status", None) != "reported")

    @property
    def remaining_quantity(self) -> int:
        if self.reference_sort_order is not None and self.reference_remaining_quantity is not None:
            return self.reference_remaining_quantity
        return sum(int(batch.stock_remaining or 0) for batch in self.batches if getattr(batch, "status", None) != "reported")
