from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.batch import BatchStatus


class BatchBase(BaseModel):
    product_id: int
    batch_no: str
    shelf_id: Optional[int] = None
    stock_in: int = 0
    stock_out: int = 0
    stock_remaining: int = 0
    purchase_price: Optional[float] = None
    purchase_price_before_tax: Optional[float] = None
    sell_price: Optional[float] = None
    cost_price: Optional[float] = None
    total_cost: Optional[float] = None
    production_date: Optional[date] = None
    expire_date: Optional[date] = None
    supplier_id: Optional[int] = None
    paid_amount: Optional[float] = None
    supplier_outstanding: Optional[float] = None
    supplier_invoice_no: Optional[str] = None
    product_type: Optional[str] = None
    reference_batch_no: Optional[str] = None
    reference_sort_order: Optional[int] = None
    reference_created_at: Optional[date] = None
    reference_product_name: Optional[str] = None
    reference_medicine_formula: Optional[str] = None
    reference_sell_price_display: Optional[str] = None
    reference_cost_price_display: Optional[str] = None
    barcode: Optional[str] = None
    box_quantity: Optional[int] = None
    units_per_box: Optional[int] = None
    items_per_unit: Optional[int] = None
    cost_price_per_box: Optional[float] = None
    boxes_price: Optional[float] = None
    stock_purchase_price_before_discount: Optional[float] = None
    discount_percentage: Optional[float] = None
    batch_discount: Optional[float] = None
    tax_percentage: Optional[float] = None
    tax_amount: Optional[float] = None
    purchasing_method: Optional[str] = None
    max_discount_percentage: Optional[float] = None
    batch_purchase_date: Optional[date] = None
    expiry_reminder: Optional[str] = None
    stock_out_reminder: Optional[str] = None
    status: BatchStatus = BatchStatus.active


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BatchBase):
    batch_no: Optional[str] = None
    product_id: Optional[int] = None


class BatchResponse(BatchBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_name: Optional[str] = None
    shelf_name: Optional[str] = None
    supplier_name: Optional[str] = None
    added_by_name: Optional[str] = None
    updated_by_name: Optional[str] = None
    medicine_formula: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PagedBatchResponse(BaseModel):
    items: list[BatchResponse]
    total: int
    skip: int = 0
    limit: int = 50
