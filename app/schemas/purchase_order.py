from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.purchase_order import PurchaseOrderStatus


class PurchaseOrderCreate(BaseModel):
    supplier_id: Optional[int] = None
    product_id: int
    demand_id: Optional[int] = None
    quantity_type: str = "Unit"
    quantity: float = Field(gt=0)
    status: PurchaseOrderStatus = PurchaseOrderStatus.pending
    notes: Optional[str] = None


class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[int] = None
    product_id: Optional[int] = None
    demand_id: Optional[int] = None
    quantity_type: Optional[str] = None
    quantity: Optional[float] = Field(default=None, gt=0)
    status: Optional[PurchaseOrderStatus] = None
    notes: Optional[str] = None


class PurchaseOrderResponse(PurchaseOrderCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supplier_name: Optional[str] = None
    product_name: Optional[str] = None
    dose: Optional[str] = None
    manufacturer_name: Optional[str] = None
    total_quantity: int = 0
    remaining_quantity: int = 0
    created_at: datetime
    updated_at: datetime


class PurchaseOrderReceive(BaseModel):
    batch_no: str
    shelf_id: Optional[int] = None
    quantity: float = Field(gt=0)
    units_per_box: Optional[int] = None
    purchase_price: Optional[float] = None
    purchase_price_before_tax: Optional[float] = None
    sell_price: Optional[float] = None
    cost_price: Optional[float] = None
    total_cost: Optional[float] = None
    paid_amount: Optional[float] = None
    supplier_outstanding: Optional[float] = None
    supplier_invoice_no: Optional[str] = None
    production_date: Optional[date] = None
    expire_date: Optional[date] = None
    batch_purchase_date: Optional[date] = None
    purchasing_method: Optional[str] = None
