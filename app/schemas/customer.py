from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.sale import SaleResponse


class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    due_amount: float = 0


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    due_amount: Optional[float] = None


class CustomerDuePayment(BaseModel):
    amount: float
    payment_method: Optional[str] = None


class CustomerResponse(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class PagedCustomerResponse(BaseModel):
    items: list[CustomerResponse]
    total: int
    skip: int = 0
    limit: int = 50


class CustomerHistoryResponse(BaseModel):
    customer: CustomerResponse
    sales: list[SaleResponse] = []
    total_purchases: float = 0
    total_paid: float = 0
    total_due: float = 0
    total_returns: float = 0
