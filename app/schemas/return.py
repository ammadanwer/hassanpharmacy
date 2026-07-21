from datetime import date, datetime, time as dt_time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ReturnBase(BaseModel):
    return_invoice_number: Optional[str] = None
    sale_id: int
    batch_id: int
    qty_sold: float = Field(allow_inf_nan=False)
    qty_returned: float = Field(gt=0, allow_inf_nan=False)
    rate: float = Field(allow_inf_nan=False)
    amount: float = Field(allow_inf_nan=False)
    reason: Optional[str] = Field(default=None, max_length=500)
    refund_method: Optional[str] = Field(default=None, max_length=100)
    date: date


class ReturnCreate(BaseModel):
    sale_id: int
    batch_id: int
    qty_returned: int = Field(gt=0, strict=True)
    reason: Optional[str] = Field(default=None, max_length=500)
    refund_method: Optional[str] = Field(default=None, max_length=100)
    date: date


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
