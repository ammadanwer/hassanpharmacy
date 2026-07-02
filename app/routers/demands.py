from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.demand import DemandItem, DemandStatus
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus
from app.models.supplier import Supplier
from app.schemas.demand import DemandItemCreate, DemandItemResponse, DemandItemUpdate, PagedDemandResponse

router = APIRouter()


@router.get("/api/demands", response_model=list[DemandItemResponse] | PagedDemandResponse)
def list_demands(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    status: Optional[DemandStatus] = Query(default=None),
    query_text: Optional[str] = Query(default=None, alias="q"),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = db.query(DemandItem)
    if status:
        query = query.filter(DemandItem.status == status)
    if query_text:
        search = f"%{query_text.strip()}%"
        query = (
            query.outerjoin(Supplier, DemandItem.supplier_id == Supplier.id)
            .outerjoin(Product, DemandItem.product_id == Product.id)
            .filter(
                or_(
                    Supplier.name.ilike(search),
                    Product.name.ilike(search),
                    Product.brand_name.ilike(search),
                    Product.dose.ilike(search),
                    DemandItem.quantity_type.ilike(search),
                )
            )
        )
    total = query.count() if paged else 0
    items = query.order_by(DemandItem.id.desc()).offset(skip).limit(limit).all()
    if paged:
        return PagedDemandResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.post("/api/demands", response_model=DemandItemResponse, status_code=201)
def create_demand(demand_in: DemandItemCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    item = DemandItem(**demand_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/api/demands/{demand_id}", response_model=DemandItemResponse)
def update_demand(demand_id: int, demand_in: DemandItemUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    item = db.get(DemandItem, demand_id)
    if not item:
        raise HTTPException(status_code=404, detail="Demand item not found")
    for field, value in demand_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/api/demands/{demand_id}")
def delete_demand(demand_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    item = db.get(DemandItem, demand_id)
    if not item:
        raise HTTPException(status_code=404, detail="Demand item not found")
    db.query(PurchaseOrder).filter(PurchaseOrder.demand_id == item.id).update(
        {"status": PurchaseOrderStatus.cancelled, "demand_id": None},
        synchronize_session=False,
    )
    db.delete(item)
    db.commit()
    return {"message": "Demand item deleted"}
