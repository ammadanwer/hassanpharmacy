from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.stock_audit import StockAuditMode


class StockAuditCreate(BaseModel):
    product_id: int
    batch_id: int
    quantity_type: str = "Tablet"
    quantity_adjusted: float = Field(gt=0)
    adjustment_type: StockAuditMode
    reason: Optional[str] = None


class StockAuditUpdate(BaseModel):
    product_id: Optional[int] = None
    batch_id: Optional[int] = None
    quantity_type: Optional[str] = None
    quantity_adjusted: Optional[float] = Field(default=None, gt=0)
    adjustment_type: Optional[StockAuditMode] = None
    reason: Optional[str] = None


class StockAuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    batch_id: int
    product_name: Optional[str] = None
    batch_no: Optional[str] = None
    quantity_type: str
    quantity_before: float
    quantity_adjusted: float
    quantity_after: float
    adjustment_type: StockAuditMode
    amount: float
    reason: Optional[str]
    user_id: int
    created_at: datetime
    updated_at: datetime


class PagedStockAuditResponse(BaseModel):
    items: list[StockAuditResponse]
    total: int
    skip: int = 0
    limit: int = 50
