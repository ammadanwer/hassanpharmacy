from datetime import date, datetime, time as dt_time
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ReturnBase(BaseModel):
    return_invoice_number: Optional[str] = None
    sale_id: int
    batch_id: int
    qty_sold: float
    qty_returned: float
    rate: float
    amount: float
    reason: Optional[str] = None
    refund_method: Optional[str] = None
    date: date


class ReturnCreate(ReturnBase):
    pass


class ReturnBulkCreate(BaseModel):
    returns: list[ReturnCreate]


class ReturnResponse(ReturnBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    batch_no: Optional[str] = None
    total_amount: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class PagedReturnsResponse(BaseModel):
    items: list[ReturnResponse]
    total: int
    skip: int = 0
    limit: int = 100


class ReturnHistoryRow(BaseModel):
    sale_id: int
    invoice_number: str
    return_invoice_number: Optional[str] = None
    date: date
    time: Optional[dt_time] = None
    total_amount: float = 0
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    total_payable: float = 0
    paid: float = 0
    due: float = 0
    change_returned: Optional[float] = None


class PagedReturnHistoryResponse(BaseModel):
    items: list[ReturnHistoryRow]
    total: int
    skip: int = 0
    limit: int = 100


class ReturnSummaryResponse(BaseModel):
    gross_sales: float = 0
    total_return: float = 0
    net_sale: float = 0
