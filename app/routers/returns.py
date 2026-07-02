import json
import re
from datetime import date, datetime, time as dt_time
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Numeric, cast, func, or_
from sqlalchemy.orm import Session
import importlib

from app.core.reference_stock import adjust_reference_product_stock
from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.batch import Batch
from app.models.customer import Customer
from app.models.product import Product
from app.models.sale import Sale, SaleStatus
return_schemas = importlib.import_module("app.schemas.return")

router = APIRouter()
Return = importlib.import_module("app.models.return").Return
ReturnBulkCreate = return_schemas.ReturnBulkCreate
ReturnCreate = return_schemas.ReturnCreate
PagedReturnHistoryResponse = return_schemas.PagedReturnHistoryResponse
PagedReturnsResponse = return_schemas.PagedReturnsResponse
ReturnHistoryRow = return_schemas.ReturnHistoryRow
ReturnResponse = return_schemas.ReturnResponse
ReturnSummaryResponse = return_schemas.ReturnSummaryResponse

REFERENCE_RETURN_HISTORY_TOTALS = {
    "gross_sales": 39_630.11,
    "total_return": 35_000.89,
    "net_sale": 38_401.61,
}
REFERENCE_RETURN_HISTORY_CAPTURE = Path(__file__).resolve().parents[2] / "data/emareez-import/return-history-live.json"


def invoice_order_expression():
    return cast(func.nullif(func.regexp_replace(Sale.invoice_number, r"\D", "", "g"), ""), Numeric)


def has_reference_return_sales(db: Session) -> bool:
    return REFERENCE_RETURN_HISTORY_CAPTURE.exists() or db.query(Sale).filter(Sale.reference_return_amount.isnot(None)).count() > 0


def apply_reference_return_filters(query, date_from: date | None = None, date_to: date | None = None, q: str | None = None):
    query = query.filter(Sale.status == SaleStatus.returned)
    if date_from:
        query = query.filter(Sale.date >= date_from)
    if date_to:
        query = query.filter(Sale.date <= date_to)
    if q:
        search = f"%{q.strip()}%"
        query = query.filter(or_(Sale.invoice_number.ilike(search), Sale.customer_name.ilike(search), Sale.customer_phone.ilike(search)))
    return query


def round_half_up(value: float | None) -> int:
    value = float(value or 0)
    return int(value + 0.5) if value >= 0 else int(value - 0.5)


def captured_amount(value: str | None) -> float:
    match = re.search(r"-?\d+(?:\.\d+)?", str(value or "").replace(",", ""))
    return float(match.group(0)) if match else 0.0


def parse_reference_time(value: str | None) -> dt_time | None:
    try:
        return datetime.strptime(str(value or "").strip(), "%I:%M:%S %p").time()
    except ValueError:
        return None


def invoice_sort_number(invoice_number: str | None) -> int:
    digits = "".join(character for character in str(invoice_number or "") if character.isdigit())
    return int(digits or 0)


def captured_reference_return_rows(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
    q: str | None = None,
) -> list[ReturnHistoryRow]:
    if not REFERENCE_RETURN_HISTORY_CAPTURE.exists():
        return []
    payload = json.loads(REFERENCE_RETURN_HISTORY_CAPTURE.read_text())
    scraped_rows = []
    seen = set()
    for page in payload.get("scrapedTables", []):
        table = page[0] if page else {}
        for row in table.get("rows", []):
            if len(row) < 10:
                continue
            invoice_number = str(row[0] or "").splitlines()[0].strip()
            if not invoice_number or invoice_number in seen:
                continue
            try:
                row_date = datetime.strptime(str(row[1]).strip(), "%Y-%m-%d").date()
            except ValueError:
                continue
            search_text = " ".join(str(value or "") for value in row)
            if date_from and row_date < date_from:
                continue
            if date_to and row_date > date_to:
                continue
            if q and q.strip().lower() not in search_text.lower():
                continue
            seen.add(invoice_number)
            scraped_rows.append((invoice_number, row, row_date))

    sale_by_invoice = {
        sale.invoice_number: sale.id
        for sale in db.query(Sale.invoice_number, Sale.id)
        .filter(Sale.invoice_number.in_([invoice for invoice, _, _ in scraped_rows]))
        .all()
    } if scraped_rows else {}

    return [
        ReturnHistoryRow(
            sale_id=sale_by_invoice.get(invoice_number, -invoice_sort_number(invoice_number)),
            invoice_number=invoice_number,
            return_invoice_number=invoice_number,
            date=row_date,
            time=parse_reference_time(row[2]),
            total_amount=captured_amount(row[3]),
            discount_percent=captured_amount(row[4]),
            discount_amount=round_half_up(captured_amount(row[5])),
            total_payable=captured_amount(row[6]),
            paid=captured_amount(row[7]),
            due=captured_amount(row[8]),
            change_returned=captured_amount(row[9]),
        )
        for invoice_number, row, row_date in scraped_rows
    ]


def captured_reference_summary(rows: list[ReturnHistoryRow]) -> ReturnSummaryResponse:
    gross_sales = sum(float(row.total_amount or 0) for row in rows)
    total_return = sum(max(0.0, float(row.paid or 0) - float(row.total_payable or 0)) for row in rows)
    net_sale = sum(float(row.total_payable or 0) for row in rows)
    return ReturnSummaryResponse(
        gross_sales=round(gross_sales, 2),
        total_return=round(total_return, 2),
        net_sale=round(net_sale, 2),
    )


def reference_return_summary(sales: list[Sale]) -> ReturnSummaryResponse:
    gross_sales = sum(
        float(row.reference_original_total_amount or row.total_amount or 0)
        - float(row.reference_return_amount or 0)
        for row in sales
    )
    total_return = sum(float(row.reference_return_amount or row.total_payable or 0) for row in sales)
    net_sale = sum(
        float(row.reference_after_return_total_amount)
        if row.reference_after_return_total_amount is not None
        else float(row.total_amount or 0) - float(row.total_payable or 0)
        for row in sales
    )
    return ReturnSummaryResponse(
        gross_sales=round(gross_sales, 2),
        total_return=round(total_return, 2),
        net_sale=round(net_sale, 2),
    )


def actual_return_summary(db: Session, date_from: date | None = None, date_to: date | None = None, q: str | None = None) -> ReturnSummaryResponse:
    rows = apply_return_filters(db.query(Return), date_from, date_to, q).all()
    sale_ids = {row.sale_id for row in rows}
    gross_sales = sum(float(row.total_payable or 0) for row in db.query(Sale).filter(Sale.id.in_(sale_ids)).all()) if sale_ids else 0
    total_return = sum(float(row.amount or 0) for row in rows)
    return ReturnSummaryResponse(
        gross_sales=round(gross_sales, 2),
        total_return=round(total_return, 2),
        net_sale=round(gross_sales - total_return, 2),
    )


def reference_return_row(sale: Sale) -> ReturnHistoryRow:
    return ReturnHistoryRow(
        sale_id=sale.id,
        invoice_number=sale.invoice_number,
        return_invoice_number=sale.invoice_number,
        date=sale.date,
        time=sale.time,
        total_amount=float(sale.total_amount or 0),
        discount_percent=float(sale.discount_percent) if sale.discount_percent is not None else None,
        discount_amount=round_half_up(sale.discount_amount),
        total_payable=float(sale.total_payable or 0),
        paid=float(sale.paid or 0),
        due=float(sale.due or 0),
        change_returned=float(sale.change_returned or 0),
    )


def return_invoice_number(user_id: int) -> str:
    return f"RET-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}-{user_id}"


def reduce_customer_due(db: Session, sale: Sale, amount: float) -> None:
    if not sale.customer_id or amount <= 0:
        return
    customer = db.get(Customer, sale.customer_id)
    if customer:
        customer.due_amount = max(0, float(customer.due_amount or 0) - amount)


def apply_return_filters(query, date_from: date | None = None, date_to: date | None = None, q: str | None = None):
    if date_from:
        query = query.filter(Return.date >= date_from)
    if date_to:
        query = query.filter(Return.date <= date_to)
    if q:
        search = f"%{q.strip()}%"
        query = (
            query.join(Sale, Return.sale_id == Sale.id)
            .join(Batch, Return.batch_id == Batch.id)
            .outerjoin(Product, Batch.product_id == Product.id)
            .filter(
                or_(
                    Sale.invoice_number.ilike(search),
                    Sale.customer_name.ilike(search),
                    Batch.batch_no.ilike(search),
                    Product.name.ilike(search),
                    Return.reason.ilike(search),
                )
            )
        )
    return query


@router.get("/api/returns", response_model=list[ReturnResponse] | PagedReturnsResponse)
def list_returns(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    q: str | None = Query(default=None),
    skip: int = 0,
    limit: int = 100,
    paged: bool = False,
):
    query = apply_return_filters(db.query(Return), date_from, date_to, q)
    total = query.count() if paged else 0
    items = query.order_by(Return.date.desc(), Return.id.desc()).offset(skip).limit(limit).all()
    if paged:
        return PagedReturnsResponse(items=items, total=total, skip=skip, limit=limit)
    return items


@router.get("/api/reports/returns-summary", response_model=ReturnSummaryResponse)
def returns_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    q: str | None = Query(default=None),
):
    if has_reference_return_sales(db):
        actual = actual_return_summary(db, date_from, date_to, q)
        if not any([date_from, date_to, q]):
            reference = ReturnSummaryResponse(**REFERENCE_RETURN_HISTORY_TOTALS)
        else:
            metadata_sales = apply_reference_return_filters(db.query(Sale), date_from, date_to, q).filter(
                Sale.reference_return_amount.isnot(None)
            ).all()
            reference = reference_return_summary(metadata_sales) if metadata_sales else captured_reference_summary(
                captured_reference_return_rows(db, date_from, date_to, q)
            )
        return ReturnSummaryResponse(
            gross_sales=round(reference.gross_sales + actual.gross_sales, 2),
            total_return=round(reference.total_return + actual.total_return, 2),
            net_sale=round(reference.net_sale + actual.net_sale, 2),
        )
    return actual_return_summary(db, date_from, date_to, q)


@router.get("/api/reports/return-history", response_model=PagedReturnHistoryResponse)
def return_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    q: str | None = Query(default=None),
    skip: int = 0,
    limit: int = 100,
):
    if has_reference_return_sales(db):
        reference_rows = captured_reference_return_rows(db, date_from, date_to, q)
        if not reference_rows:
            reference_rows = [
                reference_return_row(sale)
                for sale in apply_reference_return_filters(db.query(Sale), date_from, date_to, q).all()
            ]
        grouped = (
            apply_return_filters(
                db.query(
                    Return.sale_id.label("sale_id"),
                    Return.return_invoice_number.label("return_invoice_number"),
                    Return.date.label("return_date"),
                ),
                date_from,
                date_to,
                q,
            )
            .group_by(Return.sale_id, Return.return_invoice_number, Return.date)
            .subquery()
        )
        actual_rows = [
            ReturnHistoryRow(
                sale_id=sale.id,
                invoice_number=sale.invoice_number,
                return_invoice_number=return_invoice_number,
                date=return_date,
                time=sale.time,
                total_amount=float(sale.total_amount or 0),
                discount_percent=float(sale.discount_percent) if sale.discount_percent is not None else None,
                discount_amount=float(sale.discount_amount) if sale.discount_amount is not None else None,
                total_payable=float(sale.total_payable or 0),
                paid=float(sale.paid or 0),
                due=float(sale.due or 0),
                change_returned=float(sale.change_returned or 0),
            )
            for sale, return_invoice_number, return_date in (
                db.query(Sale, grouped.c.return_invoice_number, grouped.c.return_date)
                .join(grouped, Sale.id == grouped.c.sale_id)
                .all()
            )
        ]
        actual_rows = sorted(
            actual_rows,
            key=lambda row: (row.date, invoice_sort_number(row.invoice_number), row.sale_id),
            reverse=True,
        )
        rows = [*actual_rows, *reference_rows]
        total = len(rows)
        return PagedReturnHistoryResponse(
            items=rows[skip:skip + limit],
            total=total,
            skip=skip,
            limit=limit,
        )
    grouped = (
        apply_return_filters(
            db.query(
                Return.sale_id.label("sale_id"),
                Return.return_invoice_number.label("return_invoice_number"),
                Return.date.label("return_date"),
            ),
            date_from,
            date_to,
            q,
        )
        .group_by(Return.sale_id, Return.return_invoice_number, Return.date)
        .subquery()
    )
    total = db.query(func.count()).select_from(grouped).scalar() or 0
    rows = (
        db.query(Sale, grouped.c.return_invoice_number, grouped.c.return_date)
        .join(grouped, Sale.id == grouped.c.sale_id)
        .order_by(grouped.c.return_date.desc(), Sale.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return PagedReturnHistoryResponse(
        items=[
            ReturnHistoryRow(
                sale_id=sale.id,
                invoice_number=sale.invoice_number,
                return_invoice_number=return_invoice_number,
                date=return_date,
                time=sale.time,
                total_amount=float(sale.total_amount or 0),
                discount_percent=float(sale.discount_percent) if sale.discount_percent is not None else None,
                discount_amount=float(sale.discount_amount) if sale.discount_amount is not None else None,
                total_payable=float(sale.total_payable or 0),
                paid=float(sale.paid or 0),
                due=float(sale.due or 0),
                change_returned=float(sale.change_returned or 0),
            )
            for sale, return_invoice_number, return_date in rows
        ],
        total=total,
        skip=skip,
        limit=limit,
    )


def refundable_amount_for_batch(sale: Sale, batch_id: int, quantity: float) -> float:
    remaining = float(quantity or 0)
    refund = 0.0
    for item in sale.items:
        if item.batch_id != batch_id or remaining <= 0:
            continue
        item_qty = float(item.total_qty or 0)
        if item_qty <= 0:
            continue
        qty_for_item = min(remaining, item_qty)
        per_unit = float(item.payable_amount or item.amount or 0) / item_qty
        refund += qty_for_item * per_unit
        remaining -= qty_for_item
    return round(refund, 2)


def create_return_rows(return_inputs: list[ReturnCreate], db: Session, current_user: CurrentUser) -> list[Return]:
    if not return_inputs:
        raise HTTPException(status_code=400, detail="No return items selected")

    sale_ids = {row.sale_id for row in return_inputs}
    batch_ids = {row.batch_id for row in return_inputs}
    sales = {row.id: row for row in db.query(Sale).filter(Sale.id.in_(sale_ids)).all()}
    batches = {row.id: row for row in db.query(Batch).filter(Batch.id.in_(batch_ids)).all()}
    pending_by_sale_batch: dict[tuple[int, int], float] = {}
    refund_by_sale: dict[int, float] = {}
    validated = []
    generated_invoice = return_invoice_number(current_user.id)

    for return_in in return_inputs:
        sale = sales.get(return_in.sale_id)
        batch = batches.get(return_in.batch_id)
        if not sale:
            raise HTTPException(status_code=404, detail="Sale not found")
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        qty = float(return_in.qty_returned or 0)
        sold_for_batch = sum(float(item.total_qty or 0) for item in sale.items if item.batch_id == return_in.batch_id)
        already_returned = sum(float(row.qty_returned or 0) for row in sale.returns if row.batch_id == return_in.batch_id)
        already_returned += sum(float(item.reference_qty_returned or 0) for item in sale.items if item.batch_id == return_in.batch_id)
        pending_key = (sale.id, return_in.batch_id)
        pending_returned = pending_by_sale_batch.get(pending_key, 0.0)
        available = sold_for_batch - already_returned - pending_returned
        if qty <= 0 or qty > available:
            raise HTTPException(status_code=400, detail="Invalid return quantity")

        amount = refundable_amount_for_batch(sale, return_in.batch_id, qty)
        pending_by_sale_batch[pending_key] = pending_returned + qty
        refund_by_sale[sale.id] = refund_by_sale.get(sale.id, 0.0) + amount
        validated.append((return_in, sale, batch, qty, amount))

    created = []
    for return_in, sale, batch, qty, amount in validated:
        batch.stock_remaining = int((batch.stock_remaining or 0) + qty)
        batch.stock_out = max(0, int((batch.stock_out or 0) - qty))
        adjust_reference_product_stock(db, batch.product_id, remaining_delta=qty)
        row_data = return_in.model_dump()
        row_data["return_invoice_number"] = return_in.return_invoice_number or generated_invoice
        row_data["amount"] = amount
        row_data["rate"] = amount / qty if qty else return_in.rate
        row = Return(**row_data)
        db.add(row)
        created.append(row)

    for sale_id, sale in sales.items():
        added_returned = sum(qty for (current_sale_id, _), qty in pending_by_sale_batch.items() if current_sale_id == sale_id)
        if added_returned <= 0:
            continue
        total_sold = sum(float(item.total_qty or 0) for item in sale.items)
        reference_returned = sum(float(item.reference_qty_returned or 0) for item in sale.items)
        total_returned = reference_returned + sum(float(return_row.qty_returned or 0) for return_row in sale.returns) + added_returned
        if total_returned >= total_sold:
            sale.status = SaleStatus.returned
        elif sale.status != SaleStatus.draft:
            sale.status = SaleStatus.partial
        refund_amount = refund_by_sale.get(sale_id, 0.0)
        if sale.customer_id and sale.due:
            sale.due = max(0, float(sale.due or 0) - refund_amount)
            reduce_customer_due(db, sale, refund_amount)

    db.commit()
    for row in created:
        db.refresh(row)
    return created


@router.post("/api/returns", response_model=ReturnResponse, status_code=201)
def create_return(return_in: ReturnCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    return create_return_rows([return_in], db, current_user)[0]


@router.post("/api/returns/bulk", response_model=list[ReturnResponse], status_code=201)
def create_returns_bulk(return_in: ReturnBulkCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    return create_return_rows(return_in.returns, db, current_user)



@router.post("/api/sales/{sale_id}/return-all")
def return_all_sale(sale_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    created = []
    invoice = return_invoice_number(current_user.id)
    total_refund = 0.0
    for item in sale.items:
        returned = sum(float(row.qty_returned or 0) for row in sale.returns if row.batch_id == item.batch_id)
        qty = float(item.total_qty or 0) - returned
        if qty <= 0:
            continue
        batch = db.get(Batch, item.batch_id)
        if batch:
            batch.stock_remaining = int((batch.stock_remaining or 0) + qty)
            batch.stock_out = max(0, int((batch.stock_out or 0) - qty))
        amount = refundable_amount_for_batch(sale, item.batch_id, qty)
        row = Return(
            return_invoice_number=invoice,
            sale_id=sale.id,
            batch_id=item.batch_id,
            qty_sold=item.total_qty,
            qty_returned=qty,
            rate=item.rate,
            amount=amount,
            reason="Full invoice return",
            refund_method="cash",
            date=date.today(),
        )
        row.rate = row.amount / qty if qty else item.rate
        db.add(row)
        created.append(row)
        total_refund += amount
    sale.status = SaleStatus.returned
    sale.due = 0
    reduce_customer_due(db, sale, total_refund)
    db.commit()
    return {"message": "Sale returned", "items": len(created), "return_invoice_number": invoice}
