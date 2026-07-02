from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ManufacturerBase(BaseModel):
    name: str
    country: Optional[str] = None
    website: Optional[str] = None


class ManufacturerCreate(ManufacturerBase):
    pass


class ManufacturerUpdate(ManufacturerBase):
    pass


class ManufacturerResponse(ManufacturerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class PagedManufacturerResponse(BaseModel):
    items: list[ManufacturerResponse]
    total: int
    skip: int = 0
    limit: int = 50
