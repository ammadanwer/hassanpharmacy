from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ShelfBase(BaseModel):
    name: str
    location: Optional[str] = None
    description: Optional[str] = None


class ShelfCreate(ShelfBase):
    pass


class ShelfUpdate(ShelfBase):
    pass


class ShelfResponse(ShelfBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    total_batches: int = 0
    created_at: datetime
    updated_at: datetime


class PagedShelfResponse(BaseModel):
    items: list[ShelfResponse]
    total: int
    skip: int = 0
    limit: int = 50
