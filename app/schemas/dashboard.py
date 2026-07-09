from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class DashboardExpiredBatchRow(BaseModel):
    id: int
    batch_no: str
    product_name: str
    expire_date: Optional[date] = None


class DashboardSummaryResponse(BaseModel):
    today_net_sales: float = 0
    month_revenue: float = 0
    month_pending: float = 0
    report_sold: float = 0
    report_invoices: int = 0
    all_products: int = 0
    medical_products: int = 0
    non_medical_products: int = 0
    total_cost: float = 0
    total_expected_profit: float = 0
    shortage: int = 0
    batches_in_stock: int = 0
    batches_out_of_stock: int = 0
    expired_batches: int = 0
    expired_rows: list[DashboardExpiredBatchRow] = Field(default_factory=list)
    frequent_items: str = "-"
