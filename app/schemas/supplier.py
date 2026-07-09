from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    status: str = "active"


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    pass


class SupplierResponse(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    total_batches: Optional[int] = None
    stock_purchase_price: Optional[float] = None
    paid_amount: Optional[float] = None
    supplier_outstanding: Optional[float] = None
    payment_status: str = "Paid"
    created_at: datetime
    updated_at: datetime


class PagedSupplierResponse(BaseModel):
    items: list[SupplierResponse]
    total: int
    skip: int = 0
    limit: int = 50


class SupplierInvoiceSummaryRow(BaseModel):
    id: str
    invoice_no: str
    invoice_key: str
    batches_count: int = 0
    stock_in: int = 0
    stock_remaining: int = 0
    total_cost: float = 0
    sale_value: float = 0
    expected_profit: float = 0
    latest_date: Optional[datetime] = None


class SupplierInvoiceBatchRow(BaseModel):
    id: int
    batch_no: str
    reference_batch_no: Optional[str] = None
    reference_product_name: Optional[str] = None
    product_name: Optional[str] = None
    box_quantity: Optional[int] = None
    tablets_per_box: int = 1
    stock_in: int = 0
    stock_remaining: int = 0
    cost_price: Optional[float] = None
    sell_price: Optional[float] = None
    sale_value: float = 0
    expected_profit: float = 0
    expire_date: Optional[date] = None
