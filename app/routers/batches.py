from datetime import date, datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.core.reference_stock import adjust_reference_product_stock
from app.db.session import get_db
from app.models.batch import Batch, BatchStatus
from app.models.product import Product
from app.models.shelf import Shelf
from app.models.supplier import Supplier
from app.schemas.batch import BatchCreate, BatchUpdate, BatchResponse, PagedBatchResponse

router = APIRouter()


@router.get("/api/batches", response_model=list[BatchResponse] | PagedBatchResponse)
def list_batches(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    status: Optional[BatchStatus] = Query(default=None),
    added_by: Optional[int] = Query(default=None),
    updated_by: Optional[int] = Query(default=None),
    supplier_id: Optional[int] = Query(default=None),
    date: Optional[date] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    date_field: str = Query(default="created_at"),
    stock_filter: Optional[str] = Query(default=None),
    query_text: Optional[str] = Query(default=None, alias="q"),
    skip: int = 0,
    limit: int = 50,
    paged: bool = False,
):
    query = db.query(Batch)
    if status:
        query = query.filter(Batch.status == status)
    if added_by is not None:
        query = query.filter(Batch.added_by == added_by)
    if updated_by is not None:
        query = query.filter(Batch.updated_by == updated_by)
    if supplier_id is not None:
        query = query.filter(Batch.supplier_id == supplier_id)
    if date is not None:
        query = query.filter(Batch.expire_date <= date)
    date_column = {
        "created_at": func.date(Batch.created_at),
        "expire_date": Batch.expire_date,
        "production_date": Batch.production_date,
        "purchase_date": Batch.batch_purchase_date,
    }.get(date_field, func.date(Batch.created_at))
    if date_from is not None:
        query = query.filter(date_column >= date_from)
    if date_to is not None:
        query = query.filter(date_column <= date_to)
    if stock_filter == "in_stock":
        query = query.filter(Batch.stock_remaining > 0)
    elif stock_filter == "out_of_stock":
        query = query.filter(Batch.stock_remaining <= 0)
    elif stock_filter == "shortage":
        query = query.filter(Batch.stock_remaining > 0, Batch.stock_remaining <= 10)
    if query_text:
        search = f"%{query_text.strip()}%"
        query = (
            query.outerjoin(Product, Batch.product_id == Product.id)
            .outerjoin(Supplier, Batch.supplier_id == Supplier.id)
            .outerjoin(Shelf, Batch.shelf_id == Shelf.id)
            .filter(
                or_(
                    Batch.batch_no.ilike(search),
                    Batch.barcode.ilike(search),
                    Batch.supplier_invoice_no.ilike(search),
                    Product.name.ilike(search),
                    Product.medicine_formula.ilike(search),
                    Supplier.name.ilike(search),
                    Shelf.name.ilike(search),
                )
            )
        )
    total = query.count() if paged else 0
    items = query.order_by(Batch.reference_sort_order.is_(None), Batch.reference_sort_order.asc(), desc(Batch.id)).offset(skip).limit(limit).all()
    if paged:
        return PagedBatchResponse(items=items, total=total, skip=skip, limit=limit)
    return items


def apply_batch_search(query, query_text: Optional[str]):
    if not query_text:
        return query
    search = f"%{query_text.strip()}%"
    return (
        query.outerjoin(Product, Batch.product_id == Product.id)
        .outerjoin(Supplier, Batch.supplier_id == Supplier.id)
        .outerjoin(Shelf, Batch.shelf_id == Shelf.id)
        .filter(
            or_(
                Batch.batch_no.ilike(search),
                Batch.barcode.ilike(search),
                Batch.supplier_invoice_no.ilike(search),
                Product.name.ilike(search),
                Product.medicine_formula.ilike(search),
                Supplier.name.ilike(search),
                Shelf.name.ilike(search),
            )
        )
    )


@router.get("/api/batches/expired", response_model=list[BatchResponse] | PagedBatchResponse)
def expired_batches(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    query_text: Optional[str] = Query(default=None, alias="q"),
    skip: int = 0,
    limit: int = 50,
    paged: bool = False,
):
    today = date.today()
    query = db.query(Batch).filter(Batch.expire_date < today, Batch.status == BatchStatus.active)
    query = apply_batch_search(query, query_text)
    total = query.count() if paged else 0
    items = query.order_by(Batch.expire_date.asc(), desc(Batch.id)).offset(skip).limit(limit).all()
    if paged:
        return PagedBatchResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.get("/api/batches/near-expiry", response_model=list[BatchResponse] | PagedBatchResponse)
def near_expiry_batches(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    near_expiry_days: int = 30,
    query_text: Optional[str] = Query(default=None, alias="q"),
    skip: int = 0,
    limit: int = 50,
    paged: bool = False,
):
    today = date.today()
    deadline = date.today() + __import__("datetime").timedelta(days=near_expiry_days)
    query = db.query(Batch).filter(Batch.expire_date >= today, Batch.expire_date <= deadline, Batch.status == BatchStatus.active)
    query = apply_batch_search(query, query_text)
    total = query.count() if paged else 0
    items = query.order_by(Batch.expire_date.asc(), desc(Batch.id)).offset(skip).limit(limit).all()
    if paged:
        return PagedBatchResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.get("/api/batches/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.post("/api/batches", response_model=BatchResponse, status_code=201)
def create_batch(batch_in: BatchCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    existing = db.query(Batch).filter(Batch.batch_no == batch_in.batch_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Batch number already exists")
    batch = Batch(**batch_in.model_dump())
    batch.added_by = current_user.id
    batch.updated_by = current_user.id
    db.add(batch)
    adjust_reference_product_stock(
        db,
        batch.product_id,
        total_delta=float(batch.stock_in or 0),
        remaining_delta=float(batch.stock_remaining or 0),
    )
    db.commit()
    db.refresh(batch)
    return batch


@router.put("/api/batches/{batch_id}", response_model=BatchResponse)
def update_batch(batch_id: int, batch_in: BatchUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    old_product_id = batch.product_id
    old_stock_in = float(batch.stock_in or 0)
    old_stock_remaining = float(batch.stock_remaining or 0)
    for field, value in batch_in.model_dump(exclude_unset=True).items():
        setattr(batch, field, value)
    batch.updated_by = current_user.id
    if old_product_id != batch.product_id:
        adjust_reference_product_stock(db, old_product_id, total_delta=-old_stock_in, remaining_delta=-old_stock_remaining)
        adjust_reference_product_stock(db, batch.product_id, total_delta=float(batch.stock_in or 0), remaining_delta=float(batch.stock_remaining or 0))
    else:
        adjust_reference_product_stock(
            db,
            batch.product_id,
            total_delta=float(batch.stock_in or 0) - old_stock_in,
            remaining_delta=float(batch.stock_remaining or 0) - old_stock_remaining,
        )
    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/api/batches/{batch_id}")
def delete_batch(batch_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.status != BatchStatus.reported:
        adjust_reference_product_stock(
            db,
            batch.product_id,
            total_delta=-float(batch.stock_in or 0),
            remaining_delta=-float(batch.stock_remaining or 0),
        )
    batch.status = BatchStatus.reported
    db.commit()
    return {"message": "Batch deleted (reported)"}
