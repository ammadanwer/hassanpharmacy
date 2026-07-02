from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.category import CategoryType


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: CategoryType = CategoryType.medical


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class PagedCategoryResponse(BaseModel):
    items: list[CategoryResponse]
    total: int
    skip: int = 0
    limit: int = 50
