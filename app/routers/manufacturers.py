from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.manufacturer import Manufacturer
from app.models.product import Product
from app.schemas.manufacturer import (
    ManufacturerCreate,
    ManufacturerUpdate,
    ManufacturerResponse,
    PagedManufacturerResponse,
)

router = APIRouter()


@router.get("/api/manufacturers", response_model=list[ManufacturerResponse] | PagedManufacturerResponse)
def list_manufacturers(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    query_text: Optional[str] = Query(default=None, alias="q"),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = db.query(Manufacturer)
    if query_text:
        search = f"%{query_text.strip()}%"
        query = query.filter(or_(Manufacturer.name.ilike(search), Manufacturer.country.ilike(search), Manufacturer.website.ilike(search)))
    total = query.count() if paged else 0
    items = query.order_by(Manufacturer.reference_sort_order.is_(None), Manufacturer.reference_sort_order.asc(), Manufacturer.id.asc()).offset(skip).limit(limit).all()
    if paged:
        return PagedManufacturerResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.post("/api/manufacturers", response_model=ManufacturerResponse, status_code=201)
def create_manufacturer(manufacturer_in: ManufacturerCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    manufacturer = Manufacturer(**manufacturer_in.model_dump())
    db.add(manufacturer)
    db.commit()
    db.refresh(manufacturer)
    return manufacturer


@router.put("/api/manufacturers/{manufacturer_id}", response_model=ManufacturerResponse)
def update_manufacturer(manufacturer_id: int, manufacturer_in: ManufacturerUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    manufacturer = db.get(Manufacturer, manufacturer_id)
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    for field, value in manufacturer_in.model_dump(exclude_unset=True).items():
        setattr(manufacturer, field, value)
    db.commit()
    db.refresh(manufacturer)
    return manufacturer


@router.delete("/api/manufacturers/{manufacturer_id}")
def delete_manufacturer(manufacturer_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    manufacturer = db.get(Manufacturer, manufacturer_id)
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    if db.query(Product.id).filter(Product.manufacturer_id == manufacturer_id).first():
        raise HTTPException(status_code=409, detail="Manufacturer is in use and cannot be deleted")
    db.delete(manufacturer)
    db.commit()
    return {"message": "Manufacturer deleted"}
