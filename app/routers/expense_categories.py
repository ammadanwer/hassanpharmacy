from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.expense import Expense
from app.models.expense_category import ExpenseCategory
from app.schemas.expense_category import (
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    ExpenseCategoryResponse,
    PagedExpenseCategoryResponse,
)

router = APIRouter()


@router.get("/api/expense-categories", response_model=list[ExpenseCategoryResponse] | PagedExpenseCategoryResponse)
def list_expense_categories(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    query_text: Optional[str] = Query(default=None, alias="q"),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = db.query(ExpenseCategory)
    if query_text:
        search = f"%{query_text.strip()}%"
        query = query.filter(or_(ExpenseCategory.name.ilike(search), ExpenseCategory.description.ilike(search)))
    total = query.count() if paged else 0
    items = query.order_by(ExpenseCategory.reference_sort_order.is_(None), ExpenseCategory.reference_sort_order.asc(), ExpenseCategory.id.asc()).offset(skip).limit(limit).all()
    if paged:
        return PagedExpenseCategoryResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.post("/api/expense-categories", response_model=ExpenseCategoryResponse, status_code=201)
def create_expense_category(category_in: ExpenseCategoryCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    category = ExpenseCategory(**category_in.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/api/expense-categories/{category_id}", response_model=ExpenseCategoryResponse)
def update_expense_category(category_id: int, category_in: ExpenseCategoryUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    category = db.get(ExpenseCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Expense category not found")
    for field, value in category_in.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/api/expense-categories/{category_id}")
def delete_expense_category(category_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    category = db.get(ExpenseCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Expense category not found")
    if db.query(Expense.id).filter(Expense.expense_category_id == category_id).first():
        raise HTTPException(status_code=409, detail="Expense category is in use and cannot be deleted")
    db.delete(category)
    db.commit()
    return {"message": "Expense category deleted"}
