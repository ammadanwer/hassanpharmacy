import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session, selectinload

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.batch import Batch
from app.models.supplier import Supplier
from app.schemas.supplier import (
    PagedSupplierResponse,
    SupplierCreate,
    SupplierInvoiceBatchRow,
    SupplierInvoiceSummaryRow,
    SupplierResponse,
    SupplierUpdate,
)

router = APIRouter()


def supplier_invoice_key(batch: Batch) -> str:
    value = (batch.supplier_invoice_no or "").strip()
    return value if value and value != "-" else "No Invoice"


def batch_cost_total(batch: Batch) -> float:
    explicit_total = float(batch.total_cost or 0)
    if explicit_total:
        return explicit_total
    return float(batch.cost_price or 0) * float(batch.stock_in or 0)


def batch_sale_value(batch: Batch) -> float:
    return float(batch.sell_price or 0) * float(batch.stock_in or 0)


def batch_expected_profit(batch: Batch) -> float:
    return batch_sale_value(batch) - batch_cost_total(batch)


def batch_tablets_per_box(batch: Batch) -> int:
    return int(batch.units_per_box or 1) * int(batch.items_per_unit or 1)


def batch_latest_date(batch: Batch) -> Optional[datetime.datetime]:
    return batch.reference_created_at or batch.created_at


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


@router.get("/api/suppliers/{supplier_id}/invoice-summary", response_model=list[SupplierInvoiceSummaryRow])
def supplier_invoice_summary(supplier_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    if not db.get(Supplier, supplier_id):
        raise HTTPException(status_code=404, detail="Supplier not found")
    batches = db.query(Batch).filter(Batch.supplier_id == supplier_id).all()
    groups = {}
    for batch in batches:
        invoice_key = supplier_invoice_key(batch)
        row = groups.setdefault(
            invoice_key,
            {
                "id": invoice_key,
                "invoice_no": invoice_key,
                "invoice_key": invoice_key,
                "batches_count": 0,
                "stock_in": 0,
                "stock_remaining": 0,
                "total_cost": 0.0,
                "sale_value": 0.0,
                "expected_profit": 0.0,
                "latest_date": None,
            },
        )
        row["batches_count"] += 1
        row["stock_in"] += int(batch.stock_in or 0)
        row["stock_remaining"] += int(batch.stock_remaining or 0)
        row["total_cost"] += batch_cost_total(batch)
        row["sale_value"] += batch_sale_value(batch)
        row["expected_profit"] += batch_expected_profit(batch)
        latest_date = batch_latest_date(batch)
        if latest_date and (not row["latest_date"] or latest_date > row["latest_date"]):
            row["latest_date"] = latest_date
    return sorted(groups.values(), key=lambda row: (row["latest_date"] or datetime.datetime.min, row["invoice_no"]), reverse=True)


@router.get("/api/suppliers/{supplier_id}/invoice-batches", response_model=list[SupplierInvoiceBatchRow])
def supplier_invoice_batches(
    supplier_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    invoice_no: str = Query(default="No Invoice"),
):
    if not db.get(Supplier, supplier_id):
        raise HTTPException(status_code=404, detail="Supplier not found")
    batches = (
        db.query(Batch)
        .options(selectinload(Batch.product))
        .filter(Batch.supplier_id == supplier_id)
        .order_by(Batch.reference_sort_order.is_(None), Batch.reference_sort_order.asc(), desc(Batch.id))
        .all()
    )
    rows = []
    for batch in batches:
        if supplier_invoice_key(batch) != invoice_no:
            continue
        rows.append(
            SupplierInvoiceBatchRow(
                id=batch.id,
                batch_no=batch.batch_no,
                reference_batch_no=batch.reference_batch_no,
                reference_product_name=batch.reference_product_name,
                product_name=batch.product_name,
                box_quantity=batch.box_quantity,
                tablets_per_box=batch_tablets_per_box(batch),
                stock_in=int(batch.stock_in or 0),
                stock_remaining=int(batch.stock_remaining or 0),
                cost_price=batch.cost_price,
                sell_price=batch.sell_price,
                sale_value=batch_sale_value(batch),
                expected_profit=batch_expected_profit(batch),
                expire_date=batch.expire_date,
            )
        )
    return rows


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
