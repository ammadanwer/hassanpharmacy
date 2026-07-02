from datetime import date as date_type, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ExpenseBase(BaseModel):
    date: date_type
    name: str
    expense_category_id: int
    expense_amount: float
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(ExpenseBase):
    date: Optional[date_type] = None
    name: Optional[str] = None
    expense_category_id: Optional[int] = None
    expense_amount: Optional[float] = None
    notes: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    expense_category_name: Optional[str] = None
    created_by: int
    created_at: datetime
    updated_at: datetime


class PagedExpenseResponse(BaseModel):
    items: list[ExpenseResponse]
    total: int
    skip: int = 0
    limit: int = 50
