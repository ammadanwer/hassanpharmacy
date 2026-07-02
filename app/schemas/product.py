from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.product import ProductType


class ProductBase(BaseModel):
    name: str
    barcode: Optional[str] = None
    brand_name: Optional[str] = None
    category_id: Optional[int] = None
    formula_id: Optional[int] = None
    manufacturer_id: Optional[int] = None
    dose: Optional[str] = None
    unit: Optional[str] = None
    weight: Optional[str] = None
    generic_name: Optional[str] = None
    medicine_formula: Optional[str] = None
    prescription_required: bool = False
    status: str = "active"
    type: ProductType = ProductType.medical


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    barcode: Optional[str] = None
    brand_name: Optional[str] = None
    category_id: Optional[int] = None
    formula_id: Optional[int] = None
    manufacturer_id: Optional[int] = None
    dose: Optional[str] = None
    unit: Optional[str] = None
    weight: Optional[str] = None
    generic_name: Optional[str] = None
    medicine_formula: Optional[str] = None
    prescription_required: Optional[bool] = None
    status: Optional[str] = None
    type: Optional[ProductType] = None


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_name: Optional[str] = None
    formula_name: Optional[str] = None
    manufacturer_name: Optional[str] = None
    display_generic_name: Optional[str] = None
    total_quantity: int = 0
    remaining_quantity: int = 0
    created_at: datetime
    updated_at: datetime


class PagedProductResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    skip: int = 0
    limit: int = 50
    stock_counts: Optional[dict[str, int]] = None
