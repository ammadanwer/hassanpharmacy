from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.batch import Batch
from app.models.product import Product
from app.models.shelf import Shelf
from app.schemas.shelf import ShelfCreate, ShelfUpdate, ShelfResponse, PagedShelfResponse

router = APIRouter()


@router.get("/api/shelves", response_model=list[ShelfResponse] | PagedShelfResponse)
def list_shelves(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    query_text: Optional[str] = Query(default=None, alias="q"),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = db.query(Shelf)
    if query_text:
        search = f"%{query_text.strip()}%"
        query = (
            query.outerjoin(Batch, Shelf.id == Batch.shelf_id)
            .outerjoin(Product, Batch.product_id == Product.id)
            .filter(
                or_(
                    Shelf.name.ilike(search),
                    Shelf.location.ilike(search),
                    Shelf.description.ilike(search),
                    Batch.batch_no.ilike(search),
                    Product.name.ilike(search),
                    Product.brand_name.ilike(search),
                    Product.medicine_formula.ilike(search),
                )
            )
            .distinct()
        )
    total = query.count() if paged else 0
    items = query.order_by(Shelf.id.asc()).offset(skip).limit(limit).all()
    if paged:
        return PagedShelfResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.post("/api/shelves", response_model=ShelfResponse, status_code=201)
def create_shelf(shelf_in: ShelfCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    shelf = Shelf(**shelf_in.model_dump())
    db.add(shelf)
    db.commit()
    db.refresh(shelf)
    return shelf


@router.put("/api/shelves/{shelf_id}", response_model=ShelfResponse)
def update_shelf(shelf_id: int, shelf_in: ShelfUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    shelf = db.get(Shelf, shelf_id)
    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf not found")
    for field, value in shelf_in.model_dump(exclude_unset=True).items():
        setattr(shelf, field, value)
    db.commit()
    db.refresh(shelf)
    return shelf


@router.delete("/api/shelves/{shelf_id}")
def delete_shelf(shelf_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    shelf = db.get(Shelf, shelf_id)
    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf not found")
    if db.query(Batch.id).filter(Batch.shelf_id == shelf_id).first():
        raise HTTPException(status_code=409, detail="Shelf is in use and cannot be deleted")
    db.delete(shelf)
    db.commit()
    return {"message": "Shelf deleted"}
