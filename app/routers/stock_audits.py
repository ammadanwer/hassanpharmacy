from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.batch import Batch
from app.models.product import Product
from app.models.stock_audit import StockAudit, StockAuditMode
from app.schemas.stock_audit import PagedStockAuditResponse, StockAuditCreate, StockAuditResponse, StockAuditUpdate

router = APIRouter()


def effective_audit_quantity(batch: Batch, quantity: float, quantity_type: str) -> float:
    units_per_box = float(batch.units_per_box or 1)
    items_per_unit = float(batch.items_per_unit or 1)
    normalized_type = (quantity_type or "tablet").lower()
    if normalized_type == "box":
        return quantity * units_per_box * items_per_unit
    if normalized_type == "patta":
        return quantity * items_per_unit
    return quantity


def apply_audit_to_batch(batch: Batch, quantity: float, adjustment_type: StockAuditMode) -> tuple[float, float]:
    before = float(batch.stock_remaining or 0)
    if adjustment_type == StockAuditMode.decrease:
        after = before - quantity
        if after < 0:
            raise HTTPException(status_code=400, detail="Adjustment exceeds current stock")
        batch.stock_out = int((batch.stock_out or 0) + quantity)
    else:
        after = before + quantity
        batch.stock_in = int((batch.stock_in or 0) + quantity)
    batch.stock_remaining = int(after)
    return before, after


def reverse_audit_from_batch(batch: Batch, audit: StockAudit):
    quantity = float(audit.quantity_adjusted or 0)
    if audit.adjustment_type == StockAuditMode.decrease:
        batch.stock_out = max(0, int((batch.stock_out or 0) - quantity))
        batch.stock_remaining = int(float(batch.stock_remaining or 0) + quantity)
    else:
        after = float(batch.stock_remaining or 0) - quantity
        if after < 0:
            raise HTTPException(status_code=400, detail="Cannot edit audit because stock has already been consumed")
        batch.stock_in = max(0, int((batch.stock_in or 0) - quantity))
        batch.stock_remaining = int(after)


@router.get("/api/stock-audits", response_model=list[StockAuditResponse] | PagedStockAuditResponse)
def list_stock_audits(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    q: Optional[str] = Query(default=None),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = db.query(StockAudit)
    if q:
        search = f"%{q.strip()}%"
        query = (
            query.outerjoin(Product, StockAudit.product_id == Product.id)
            .outerjoin(Batch, StockAudit.batch_id == Batch.id)
            .filter(
                or_(
                    Product.name.ilike(search),
                    Product.medicine_formula.ilike(search),
                    Product.generic_name.ilike(search),
                    Batch.batch_no.ilike(search),
                    StockAudit.quantity_type.ilike(search),
                    StockAudit.adjustment_type.ilike(search),
                    StockAudit.reason.ilike(search),
                )
            )
        )
    total = query.count() if paged else 0
    items = query.order_by(StockAudit.id.desc()).offset(skip).limit(limit).all()
    if paged:
        return PagedStockAuditResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.post("/api/stock-audits", response_model=StockAuditResponse, status_code=201)
def create_stock_audit(audit_in: StockAuditCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    batch = db.get(Batch, audit_in.batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.product_id != audit_in.product_id:
        raise HTTPException(status_code=400, detail="Batch does not belong to selected product")
    effective_quantity = effective_audit_quantity(batch, audit_in.quantity_adjusted, audit_in.quantity_type)
    before, after = apply_audit_to_batch(batch, effective_quantity, audit_in.adjustment_type)
    audit = StockAudit(
        product_id=audit_in.product_id,
        batch_id=audit_in.batch_id,
        quantity_type=audit_in.quantity_type,
        quantity_before=before,
        quantity_adjusted=effective_quantity,
        quantity_after=after,
        adjustment_type=audit_in.adjustment_type,
        amount=effective_quantity * float(batch.cost_price or batch.sell_price or 0),
        reason=audit_in.reason,
        user_id=current_user.id,
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


@router.post("/api/stock-audits/bulk", response_model=list[StockAuditResponse], status_code=201)
def create_stock_audits_bulk(
    audits_in: list[StockAuditCreate],
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
):
    if not audits_in:
        raise HTTPException(status_code=400, detail="No stock audits provided")
    created = []
    for audit_in in audits_in:
        batch = db.get(Batch, audit_in.batch_id)
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if batch.product_id != audit_in.product_id:
            raise HTTPException(status_code=400, detail="Batch does not belong to selected product")
        effective_quantity = effective_audit_quantity(batch, audit_in.quantity_adjusted, audit_in.quantity_type)
        before, after = apply_audit_to_batch(batch, effective_quantity, audit_in.adjustment_type)
        audit = StockAudit(
            product_id=audit_in.product_id,
            batch_id=audit_in.batch_id,
            quantity_type=audit_in.quantity_type,
            quantity_before=before,
            quantity_adjusted=effective_quantity,
            quantity_after=after,
            adjustment_type=audit_in.adjustment_type,
            amount=effective_quantity * float(batch.cost_price or batch.sell_price or 0),
            reason=audit_in.reason,
            user_id=current_user.id,
        )
        db.add(audit)
        created.append(audit)
    db.commit()
    for audit in created:
        db.refresh(audit)
    return created


@router.put("/api/stock-audits/{audit_id}", response_model=StockAuditResponse)
def update_stock_audit(
    audit_id: int,
    audit_in: StockAuditUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
):
    audit = db.get(StockAudit, audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Stock audit not found")
    old_batch = db.get(Batch, audit.batch_id)
    if not old_batch:
        raise HTTPException(status_code=404, detail="Original batch not found")

    product_id = audit_in.product_id if audit_in.product_id is not None else audit.product_id
    batch_id = audit_in.batch_id if audit_in.batch_id is not None else audit.batch_id
    quantity_type = audit_in.quantity_type or audit.quantity_type
    adjustment_type = audit_in.adjustment_type or audit.adjustment_type
    new_batch = db.get(Batch, batch_id)
    if not new_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if new_batch.product_id != product_id:
        raise HTTPException(status_code=400, detail="Batch does not belong to selected product")
    if audit_in.quantity_adjusted is not None:
        entered_quantity = audit_in.quantity_adjusted
    else:
        normalized_quantity_type = quantity_type.lower()
        if normalized_quantity_type == "box":
            entered_quantity = float(audit.quantity_adjusted or 0) / (float(new_batch.units_per_box or 1) * float(new_batch.items_per_unit or 1))
        elif normalized_quantity_type == "patta":
            entered_quantity = float(audit.quantity_adjusted or 0) / float(new_batch.items_per_unit or 1)
        else:
            entered_quantity = float(audit.quantity_adjusted or 0)

    reverse_audit_from_batch(old_batch, audit)
    effective_quantity = effective_audit_quantity(new_batch, entered_quantity, quantity_type)
    before, after = apply_audit_to_batch(new_batch, effective_quantity, adjustment_type)

    audit.product_id = product_id
    audit.batch_id = batch_id
    audit.quantity_type = quantity_type
    audit.quantity_before = before
    audit.quantity_adjusted = effective_quantity
    audit.quantity_after = after
    audit.adjustment_type = adjustment_type
    audit.amount = effective_quantity * float(new_batch.cost_price or new_batch.sell_price or 0)
    if audit_in.reason is not None:
        audit.reason = audit_in.reason
    audit.user_id = current_user.id
    db.commit()
    db.refresh(audit)
    return audit


@router.delete("/api/stock-audits/{audit_id}", status_code=204)
def delete_stock_audit(audit_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    audit = db.get(StockAudit, audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Stock audit not found")
    batch = db.get(Batch, audit.batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    reverse_audit_from_batch(batch, audit)
    db.delete(audit)
    db.commit()
