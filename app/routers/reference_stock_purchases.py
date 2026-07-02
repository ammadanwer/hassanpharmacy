from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.reference_stock_purchase import ReferenceStockPurchase
from app.schemas.reference_stock_purchase import PagedReferenceStockPurchaseResponse

router = APIRouter()


@router.get("/api/reports/stock-purchases", response_model=PagedReferenceStockPurchaseResponse)
def list_reference_stock_purchases(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    query_text: Optional[str] = Query(default=None, alias="q"),
    purchase_date: Optional[str] = Query(default=None),
    skip: int = 0,
    limit: int = 50,
):
    query = db.query(ReferenceStockPurchase)
    if purchase_date:
        query = query.filter(ReferenceStockPurchase.purchase_date == purchase_date)
    if query_text:
        search = f"%{query_text.strip()}%"
        query = query.filter(
            or_(
                ReferenceStockPurchase.batch_no.ilike(search),
                ReferenceStockPurchase.medicine_name.ilike(search),
                ReferenceStockPurchase.invoice_id.ilike(search),
                ReferenceStockPurchase.supplier_name.ilike(search),
            )
        )
    total = query.count()
    items = query.order_by(ReferenceStockPurchase.sort_order.asc(), ReferenceStockPurchase.id.asc()).offset(skip).limit(limit).all()
    return PagedReferenceStockPurchaseResponse(items=items, total=total, skip=skip, limit=limit)
