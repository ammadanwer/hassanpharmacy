import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.batch import Batch
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse, PagedSupplierResponse

router = APIRouter()


@router.get("/api/suppliers", response_model=list[SupplierResponse] | PagedSupplierResponse)
def list_suppliers(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    query_text: Optional[str] = Query(default=None, alias="q"),
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    paged: bool = False,
):
    query = db.query(Supplier)
    if not include_inactive:
        query = query.filter(Supplier.status != "inactive")
    if query_text:
        search = f"%{query_text.strip()}%"
        query = query.filter(or_(Supplier.name.ilike(search), Supplier.contact_person.ilike(search), Supplier.phone.ilike(search), Supplier.email.ilike(search)))
    total = query.count() if paged else 0
    items = query.order_by(Supplier.reference_sort_order.is_(None), Supplier.reference_sort_order.asc(), Supplier.id.asc()).offset(skip).limit(limit).all()
    if paged:
        return PagedSupplierResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.post("/api/suppliers", response_model=SupplierResponse, status_code=201)
def create_supplier(supplier_in: SupplierCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    supplier = Supplier(**supplier_in.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/api/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/api/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: int, supplier_in: SupplierUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for field, value in supplier_in.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/api/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier.status = "inactive"
    db.commit()
    return {"message": "Supplier deleted (inactive)"}


@router.get("/api/suppliers/{supplier_id}/batches", response_model=list[dict])
def supplier_batches(supplier_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    batches = db.query(Batch).filter(Batch.supplier_id == supplier_id).order_by(desc(Batch.id)).all()
    return [
        {
            "id": b.id,
            "batch_no": b.batch_no,
            "product_name": b.product.name if b.product else None,
            "status": b.status.value if hasattr(b.status, "value") else str(b.status),
            "total_cost": b.total_cost,
            "paid_amount": b.paid_amount,
            "supplier_outstanding": b.supplier_outstanding,
        }
        for b in batches
    ]


@router.get("/api/suppliers/{supplier_id}/outstanding")
def supplier_outstanding(supplier_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    batches = db.query(Batch).filter(Batch.supplier_id == supplier_id).all()
    total = sum((b.supplier_outstanding or 0) for b in batches)
    return {"supplier_id": supplier_id, "total_outstanding": total}
