from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.sale import PaymentMethod, SaleStatus
from app.schemas.product import ProductResponse


class SaleItemCreate(BaseModel):
    item_type: str = "product"
    product_id: Optional[int] = None
    batch_id: Optional[int] = None
    product_name: Optional[str] = None
    sale_type: Optional[str] = None
    qt_in_box: float
    qt_in_units: float
    total_qty: float
    cost_price: float
    rate: float = Field(gt=0)
    amount: float
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None


class SaleItemResponse(SaleItemCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sale_id: int
    product_name: str
    batch_no: str
    payable_amount: float
    qty_returned: float = 0
    product_weight: Optional[str] = None
    product_unit: Optional[str] = None
    reference_receipt_name: Optional[str] = None
    reference_qt_in_box_display: Optional[str] = None


class SaleBase(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_id: Optional[int] = None
    doctor_name: Optional[str] = None
    date: date
    time: time
    total_amount: float
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    total_payable: float
    paid: float = 0
    due: float = 0
    change_returned: Optional[float] = None
    payment_method: Optional[PaymentMethod] = None


class SaleCreate(SaleBase):
    items: list[SaleItemCreate] = Field(min_length=1)
    sales_pin: Optional[str] = Field(default=None, min_length=3, max_length=8)


class SaleUpdate(SaleBase):
    status: Optional[SaleStatus] = None


class SaleResponse(SaleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: str
    user_id: int
    status: SaleStatus
    created_at: datetime
    reference_cost_amount: Optional[float] = None
    reference_original_total_amount: Optional[float] = None
    reference_original_discount_amount: Optional[float] = None
    reference_original_total_payable: Optional[float] = None
    reference_original_paid: Optional[float] = None
    reference_original_due: Optional[float] = None
    reference_original_due_display: Optional[str] = None
    reference_original_change_returned: Optional[float] = None
    reference_return_amount: Optional[float] = None
    reference_return_discount_percent: Optional[float] = None
    reference_return_discount_percent_visible: Optional[bool] = None
    reference_return_discount_amount: Optional[float] = None
    reference_after_return_total_amount: Optional[float] = None
    reference_after_return_net_paid: Optional[float] = None
    reference_total_amount_display: Optional[str] = None
    reference_discount_percent_display: Optional[str] = None
    reference_discount_amount_display: Optional[str] = None
    reference_total_payable_display: Optional[str] = None
    reference_paid_display: Optional[str] = None
    reference_due_display: Optional[str] = None
    reference_change_returned_display: Optional[str] = None
    items: list[SaleItemResponse] = []


class PagedSalesResponse(BaseModel):
    items: list[SaleResponse]
    total: int
    skip: int = 0
    limit: int = 50


class ProductSalesHistoryRow(BaseModel):
    product_id: int
    product_name: str
    dose: Optional[str] = None
    generic_name: Optional[str] = None
    sold_quantity: float


class PagedProductSalesHistoryResponse(BaseModel):
    items: list[ProductSalesHistoryRow]
    total: int
    skip: int = 0
    limit: int = 100


class ProductSaleInvoiceHistoryRow(BaseModel):
    sale_id: int
    invoice_number: str
    date: date
    time: time
    total_amount: float
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    total_payable: float
    paid: float
    due: float
    change_returned: Optional[float] = None


class PagedProductSaleInvoiceHistoryResponse(BaseModel):
    items: list[ProductSaleInvoiceHistoryRow]
    total: int
    skip: int = 0
    limit: int = 50


class SalesSummaryResponse(BaseModel):
    gross_sales: float = 0
    total_discount: float = 0
    net_sales: float = 0
    total_cost: float = 0
    net_revenue: float = 0
    pending: float = 0
