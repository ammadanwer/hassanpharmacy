from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.demand import DemandStatus


class DemandItemCreate(BaseModel):
    supplier_id: int
    product_id: int
    quantity_type: str = "Unit"
    quantity: float = Field(gt=0)
    status: DemandStatus = DemandStatus.pending


class DemandItemUpdate(BaseModel):
    supplier_id: Optional[int] = None
    product_id: Optional[int] = None
    quantity_type: Optional[str] = None
    quantity: Optional[float] = Field(default=None, gt=0)
    status: Optional[DemandStatus] = None


class DemandItemResponse(DemandItemCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supplier_name: Optional[str] = None
    product_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PagedDemandResponse(BaseModel):
    items: list[DemandItemResponse]
    total: int
    skip: int = 0
    limit: int = 50
