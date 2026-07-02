from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ExpenseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass


class ExpenseCategoryUpdate(ExpenseCategoryBase):
    pass


class ExpenseCategoryResponse(ExpenseCategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class PagedExpenseCategoryResponse(BaseModel):
    items: list[ExpenseCategoryResponse]
    total: int
    skip: int = 0
    limit: int = 50
