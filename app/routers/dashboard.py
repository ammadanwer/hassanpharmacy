from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.batch import Batch, BatchStatus
from app.models.product import Product, ProductType
from app.models.sale import Sale, SaleStatus
from app.models.sale_item import SaleItem
from app.schemas.dashboard import DashboardExpiredBatchRow, DashboardSummaryResponse

router = APIRouter()


def month_bounds(month: Optional[str]) -> tuple[date, date]:
    today = date.today()
    try:
        year_text, month_text = str(month or "").split("-", 1)
        year = int(year_text)
        month_number = int(month_text)
        if not 1 <= month_number <= 12:
            raise ValueError
    except ValueError:
        year = today.year
        month_number = today.month
    start = date(year, month_number, 1)
    next_month = date(year + int(month_number == 12), 1 if month_number == 12 else month_number + 1, 1)
    return start, next_month


@router.get("/api/dashboard-summary", response_model=DashboardSummaryResponse)
def dashboard_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    report_month: Optional[str] = Query(default=None),
):
    today = date.today()
    current_month_start = date(today.year, today.month, 1)
    next_current_month = date(today.year + int(today.month == 12), 1 if today.month == 12 else today.month + 1, 1)
    report_start, report_end = month_bounds(report_month)

    active_sales = Sale.status != SaleStatus.draft
    today_net_sales = db.query(func.coalesce(func.sum(Sale.total_payable), 0)).filter(active_sales, Sale.date == today).scalar() or 0
    month_totals = (
        db.query(
            func.coalesce(func.sum(Sale.total_payable), 0).label("revenue"),
            func.coalesce(func.sum(Sale.due), 0).label("pending"),
        )
        .filter(active_sales, Sale.date >= current_month_start, Sale.date < next_current_month)
        .one()
    )
    report_invoices = db.query(func.count(Sale.id)).filter(active_sales, Sale.date >= report_start, Sale.date < report_end).scalar() or 0
    report_sold = (
        db.query(func.coalesce(func.sum(SaleItem.total_qty), 0))
        .join(Sale, SaleItem.sale_id == Sale.id)
        .filter(active_sales, Sale.date >= report_start, Sale.date < report_end)
        .scalar()
        or 0
    )

    stock = (
        db.query(
            Batch.product_id.label("product_id"),
            func.coalesce(func.sum(Batch.stock_remaining), 0).label("remaining_quantity"),
            func.count(Batch.id).label("batch_count"),
        )
        .filter(Batch.status == BatchStatus.active)
        .group_by(Batch.product_id)
        .subquery()
    )
    active_products = Product.status != "reported"
    remaining_quantity = case(
        (
            and_(Product.reference_sort_order.isnot(None), Product.reference_remaining_quantity.isnot(None)),
            Product.reference_remaining_quantity,
        ),
        else_=func.coalesce(stock.c.remaining_quantity, 0),
    )
    product_counts = (
        db.query(
            func.count(Product.id).label("all_products"),
            func.coalesce(func.sum(case((Product.type == ProductType.medical, 1), else_=0)), 0).label("medical_products"),
            func.coalesce(func.sum(case((Product.type == ProductType.non_medical, 1), else_=0)), 0).label("non_medical_products"),
            func.coalesce(func.sum(case((remaining_quantity <= 0, 1), else_=0)), 0).label("shortage"),
        )
        .outerjoin(stock, stock.c.product_id == Product.id)
        .filter(active_products)
        .one()
    )

    batch_cost = case(
        (func.coalesce(Batch.total_cost, 0) != 0, func.coalesce(Batch.total_cost, 0)),
        else_=func.coalesce(Batch.cost_price, 0) * func.coalesce(Batch.stock_in, 0),
    )
    active_batches = Batch.status != BatchStatus.reported
    batch_totals = (
        db.query(
            func.coalesce(func.sum(batch_cost), 0).label("total_cost"),
            func.coalesce(func.sum((func.coalesce(Batch.sell_price, 0) * func.coalesce(Batch.stock_in, 0)) - batch_cost), 0).label("expected_profit"),
            func.coalesce(func.sum(case((Batch.stock_remaining > 0, 1), else_=0)), 0).label("in_stock"),
            func.coalesce(func.sum(case((Batch.stock_remaining <= 0, 1), else_=0)), 0).label("out_of_stock"),
            func.coalesce(func.sum(case((Batch.expire_date < today, 1), else_=0)), 0).label("expired"),
        )
        .filter(active_batches)
        .one()
    )
    expired_rows = (
        db.query(
            Batch.id,
            Batch.batch_no,
            func.coalesce(Batch.reference_product_name, Product.name).label("product_name"),
            Batch.expire_date,
        )
        .outerjoin(Product, Batch.product_id == Product.id)
        .filter(active_batches, Batch.expire_date < today)
        .order_by(Batch.expire_date.asc(), Batch.id.desc())
        .limit(5)
        .all()
    )
    frequent_rows = (
        db.query(SaleItem.product_name, func.coalesce(func.sum(SaleItem.total_qty), 0).label("sold_qty"))
        .join(Sale, SaleItem.sale_id == Sale.id)
        .filter(active_sales, SaleItem.product_name.isnot(None))
        .group_by(SaleItem.product_name)
        .order_by(func.coalesce(func.sum(SaleItem.total_qty), 0).desc())
        .limit(3)
        .all()
    )

    return DashboardSummaryResponse(
        today_net_sales=round(float(today_net_sales), 2),
        month_revenue=round(float(month_totals.revenue or 0), 2),
        month_pending=round(float(month_totals.pending or 0), 2),
        report_sold=float(report_sold),
        report_invoices=int(report_invoices),
        all_products=int(product_counts.all_products or 0),
        medical_products=int(product_counts.medical_products or 0),
        non_medical_products=int(product_counts.non_medical_products or 0),
        total_cost=round(float(batch_totals.total_cost or 0), 2),
        total_expected_profit=round(float(batch_totals.expected_profit or 0), 2),
        shortage=int(product_counts.shortage or 0),
        batches_in_stock=int(batch_totals.in_stock or 0),
        batches_out_of_stock=int(batch_totals.out_of_stock or 0),
        expired_batches=int(batch_totals.expired or 0),
        expired_rows=[DashboardExpiredBatchRow(**row._mapping) for row in expired_rows],
        frequent_items=", ".join(row.product_name for row in frequent_rows if row.product_name) or "-",
    )
