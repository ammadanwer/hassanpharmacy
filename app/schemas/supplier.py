from datetime import datetime
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
