from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.batch import Batch, BatchStatus
from app.models.demand import DemandItem, DemandStatus
from app.models.product import Product, ProductType
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus
from app.models.supplier import Supplier
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderReceive, PurchaseOrderResponse, PurchaseOrderUpdate

router = APIRouter()


@router.get("/api/purchase-orders", response_model=list[PurchaseOrderResponse])
def list_purchase_orders(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    status: Optional[PurchaseOrderStatus] = Query(default=None),
    product_type: Optional[ProductType] = Query(default=None),
    q: Optional[str] = Query(default=None),
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(PurchaseOrder).join(Product, PurchaseOrder.product_id == Product.id)
    if status:
        query = query.filter(PurchaseOrder.status == status)
    if product_type:
        query = query.filter(Product.type == product_type)
    if q:
        search = f"%{q.strip()}%"
        query = query.filter(or_(Product.name.ilike(search), Product.dose.ilike(search), Product.brand_name.ilike(search)))
    return query.order_by(PurchaseOrder.id.desc()).offset(skip).limit(limit).all()


@router.post("/api/purchase-orders", response_model=PurchaseOrderResponse, status_code=201)
def create_purchase_order(
    order_in: PurchaseOrderCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
):
    product = db.get(Product, order_in.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not order_in.supplier_id or not db.get(Supplier, order_in.supplier_id):
        raise HTTPException(status_code=400, detail="Supplier is required")
    demand = db.get(DemandItem, order_in.demand_id) if order_in.demand_id else None
    if order_in.demand_id and not demand:
        raise HTTPException(status_code=404, detail="Demand item not found")
    order = PurchaseOrder(**order_in.model_dump())
    db.add(order)
    if demand:
        demand.status = DemandStatus.ordered
    db.commit()
    db.refresh(order)
    return order


@router.post("/api/demands/{demand_id}/order", response_model=PurchaseOrderResponse, status_code=201)
def order_from_demand(
    demand_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
):
    demand = db.get(DemandItem, demand_id)
    if not demand:
        raise HTTPException(status_code=404, detail="Demand item not found")
    order = PurchaseOrder(
        supplier_id=demand.supplier_id,
        product_id=demand.product_id,
        demand_id=demand.id,
        quantity_type=demand.quantity_type,
        quantity=demand.quantity,
        status=PurchaseOrderStatus.pending,
        notes="Created from demand/order",
    )
    demand.status = DemandStatus.ordered
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.put("/api/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    order_id: int,
    order_in: PurchaseOrderUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
):
    order = db.get(PurchaseOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    for field, value in order_in.model_dump(exclude_unset=True).items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    return order


@router.post("/api/purchase-orders/{order_id}/receive", response_model=PurchaseOrderResponse)
def receive_purchase_order(
    order_id: int,
    receive_in: PurchaseOrderReceive,
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
):
    order = db.get(PurchaseOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.status == PurchaseOrderStatus.received:
        raise HTTPException(status_code=400, detail="Purchase order already received")
    if not order.supplier_id:
        raise HTTPException(status_code=400, detail="Supplier is required before receiving order")
    if db.query(Batch).filter(Batch.batch_no == receive_in.batch_no).first():
        raise HTTPException(status_code=400, detail="Batch number already exists")
    quantity = int(round(receive_in.quantity))
    batch = Batch(
        product_id=order.product_id,
        supplier_id=order.supplier_id,
        batch_no=receive_in.batch_no,
        shelf_id=receive_in.shelf_id,
        stock_in=quantity,
        stock_out=0,
        stock_remaining=quantity,
        purchase_price=receive_in.purchase_price,
        purchase_price_before_tax=receive_in.purchase_price_before_tax,
        sell_price=receive_in.sell_price,
        cost_price=receive_in.cost_price,
        total_cost=receive_in.total_cost if receive_in.total_cost is not None else (quantity * float(receive_in.cost_price or receive_in.purchase_price or 0)),
        paid_amount=receive_in.paid_amount,
        supplier_outstanding=receive_in.supplier_outstanding,
        supplier_invoice_no=receive_in.supplier_invoice_no,
        production_date=receive_in.production_date,
        expire_date=receive_in.expire_date,
        batch_purchase_date=receive_in.batch_purchase_date,
        purchasing_method=receive_in.purchasing_method,
        units_per_box=receive_in.units_per_box,
        product_type=order.product.type.value if hasattr(order.product.type, "value") else str(order.product.type),
        status=BatchStatus.active,
    )
    db.add(batch)
    order.status = PurchaseOrderStatus.received
    if order.demand:
        order.demand.status = DemandStatus.completed
    db.commit()
    db.refresh(order)
    return order


@router.delete("/api/purchase-orders/{order_id}")
def delete_purchase_order(order_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    order = db.get(PurchaseOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.demand and order.demand.status == DemandStatus.ordered:
        order.demand.status = DemandStatus.pending
    order.status = PurchaseOrderStatus.cancelled
    db.commit()
    return {"message": "Purchase order cancelled"}
