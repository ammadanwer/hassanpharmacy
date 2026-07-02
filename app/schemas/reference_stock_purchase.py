from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReferenceStockPurchaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sort_order: int
    batch_no: str
    medicine_name: str
    quantity: str
    rate: str
    total_amount: str
    extra_discount_bonus: str
    purchase_date: str
    stock_cost_price: str
    sales_tax: str
    invoice_id: str
    expire_date: str
    supplier_name: str
    created_at: datetime
    updated_at: datetime


class PagedReferenceStockPurchaseResponse(BaseModel):
    items: list[ReferenceStockPurchaseResponse]
    total: int
    skip: int = 0
    limit: int = 50
