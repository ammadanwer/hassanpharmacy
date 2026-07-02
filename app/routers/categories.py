from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, PagedCategoryResponse

router = APIRouter()


@router.get("/api/categories", response_model=list[CategoryResponse] | PagedCategoryResponse)
def list_categories(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    query_text: Optional[str] = Query(default=None, alias="q"),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = db.query(Category)
    if query_text:
        search = f"%{query_text.strip()}%"
        query = query.filter(or_(Category.name.ilike(search), Category.description.ilike(search)))
    total = query.count() if paged else 0
    items = query.order_by(Category.reference_sort_order.is_(None), Category.reference_sort_order.asc(), Category.id.asc()).offset(skip).limit(limit).all()
    if paged:
        return PagedCategoryResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.post("/api/categories", response_model=CategoryResponse, status_code=201)
def create_category(category_in: CategoryCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    category = Category(**category_in.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/api/categories/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category_in: CategoryUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in category_in.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/api/categories/{category_id}")
def delete_category(category_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if db.query(Product.id).filter(Product.category_id == category_id).first():
        raise HTTPException(status_code=409, detail="Category is in use and cannot be deleted")
    db.delete(category)
    db.commit()
    return {"message": "Category deleted"}
