import json
import math
import re
from datetime import datetime, time
from pathlib import Path

from app.db.session import SessionLocal
from app.db.schema_sync import sync_batch_columns
from app.db.session import engine
from app.models.batch import Batch
from app.models.product import Product
from app.models.sale import Sale, SaleStatus
from app.models.sale_item import SaleItem
from app.models.user import User


CAPTURE_PATH = Path("data/emareez-import/draft-sales-live.json")
DETAIL_CAPTURE_PATH = Path("reference-captures/emareez-newsale-draft-edit-details-all-current.json")
FALLBACK_BATCHES = ("55gg", "23")


def reference_invoice(draft_id):
    return f"DRAFT-{draft_id}"


def money(value):
    text = "" if value is None else str(value).replace(",", "")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    return round(float(match.group(0)), 2) if match else 0.0


def numeric(value, default=0.0):
    text = "" if value is None else str(value).replace(",", "").strip()
    try:
        parsed = float(text)
    except ValueError:
        return default
    return parsed if math.isfinite(parsed) else default


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u200b", " ")).strip()


def blank_to_none(value):
    value = clean_text(value)
    return money(value) if value else None


def split_amount(total, count):
    if count <= 0:
        return []
    base = round(float(total or 0) / count, 2)
    amounts = [base for _ in range(count)]
    amounts[-1] = round(float(total or 0) - sum(amounts[:-1]), 2)
    return amounts


def get_batch(db, batch_no):
    batch = db.query(Batch).filter(Batch.batch_no == batch_no).first()
    if not batch or not batch.product:
        raise RuntimeError(f"Missing imported reference batch {batch_no!r}")
    return batch


def reference_details():
    if not DETAIL_CAPTURE_PATH.exists():
        return {}
    payload = json.loads(DETAIL_CAPTURE_PATH.read_text())
    captures = payload.get("evalResults", {}).get("beforeClickFile", {}).get("pages", [])
    details = {}
    for capture in captures:
        item_table = next((
            table for table in capture.get("tables", [])
            if "Batch no." in table.get("headers", []) and "Payable Amt" in table.get("headers", [])
        ), None)
        if not item_table:
            continue
        rows = []
        for row in item_table.get("rows", []):
            if len(row) < 11:
                continue
            amount = money(row[7])
            total_qty = numeric(row[4])
            rows.append({
                "product_name": clean_text(row[0]),
                "batch_no": clean_text(row[1]),
                "qt_in_box": numeric(row[2]),
                "reference_qt_in_box_display": clean_text(row[2]),
                "qt_in_units": numeric(row[3]),
                "total_qty": total_qty,
                "cost_price": money(row[5]),
                "rate": round(amount / total_qty, 3) if total_qty else amount,
                "amount": amount,
                "discount_percent": blank_to_none(row[8]),
                "discount_amount": blank_to_none(row[9]),
                "payable_amount": money(row[10]),
            })
        details[capture["draftId"]] = rows
    return details


def resolve_item_batch(db, product_name, batch_no):
    product = db.query(Product).filter(Product.name.ilike(product_name)).first() if product_name else None
    batch = db.query(Batch).filter(Batch.batch_no == batch_no).first() if batch_no else None
    if batch and product and batch.product_id == product.id:
        return product, batch
    if product and product.batches:
        return product, product.batches[0]
    if batch:
        return batch.product, batch
    fallback = get_batch(db, FALLBACK_BATCHES[0])
    return product or fallback.product, fallback


def captured_item(db, item):
    product, batch = resolve_item_batch(db, item.get("product_name"), item.get("batch_no"))
    return SaleItem(
        product_id=product.id,
        batch_id=batch.id,
        product_name=item.get("product_name") or product.name,
        batch_no=item.get("batch_no") if item.get("batch_no") is not None else batch.batch_no,
        qt_in_box=numeric(item.get("qt_in_box")),
        qt_in_units=numeric(item.get("qt_in_units")),
        total_qty=numeric(item.get("total_qty")),
        cost_price=money(item.get("cost_price")),
        rate=money(item.get("rate")),
        amount=money(item.get("amount")),
        discount_percent=item.get("discount_percent"),
        discount_amount=item.get("discount_amount"),
        payable_amount=money(item.get("payable_amount")),
        reference_qt_in_box_display=item.get("reference_qt_in_box_display"),
    )


def generated_items(db, row):
    batches = [get_batch(db, batch_no) for batch_no in FALLBACK_BATCHES]
    total_items = int(row.get("total_items") or 0)
    amounts = split_amount(row.get("total_amount"), total_items)
    items = []
    for index, amount in enumerate(amounts):
        batch = batches[index % len(batches)]
        items.append(
            SaleItem(
                product_id=batch.product_id,
                batch_id=batch.id,
                product_name=batch.product.name,
                batch_no=batch.batch_no,
                qt_in_box=0,
                qt_in_units=1,
                total_qty=1,
                cost_price=money(batch.cost_price),
                rate=amount,
                amount=amount,
                discount_percent=None,
                discount_amount=None,
                payable_amount=amount,
            )
        )
    return items


def main():
    sync_batch_columns(engine)
    payload = json.loads(CAPTURE_PATH.read_text())
    rows = payload.get("rows", [])
    details = reference_details()
    db = SessionLocal()
    try:
        user = db.query(User).order_by(User.id.asc()).first()
        if not user:
            raise RuntimeError("No user exists; run the base importer or create an admin first.")

        reference_numbers = [reference_invoice(row["draft_id"]) for row in rows]
        deleted = 0
        for sale in db.query(Sale).filter(Sale.invoice_number.in_(reference_numbers)).all():
            db.delete(sale)
            deleted += 1
        db.flush()

        imported = 0
        for row in reversed(rows):
            sale = Sale(
                invoice_number=reference_invoice(row["draft_id"]),
                user_id=user.id,
                customer_name=None,
                customer_phone=None,
                doctor_name=None,
                date=datetime.strptime(row["date"], "%Y-%m-%d").date(),
                time=time(0, 0, 0),
                total_amount=money(row.get("total_amount")),
                discount_percent=money(row.get("discount_percent")),
                discount_amount=money(row.get("discount_amount")),
                total_payable=money(row.get("total_payable")),
                paid=0,
                due=money(row.get("total_payable")),
                change_returned=0,
                payment_method=None,
                status=SaleStatus.draft,
            )
            sale.items = [captured_item(db, item) for item in (details.get(row["draft_id"]) or row.get("items", []))] or generated_items(db, row)
            db.add(sale)
            imported += 1
        db.commit()
        print(json.dumps({"captured": len(rows), "detail_captures": len(details), "deleted": deleted, "imported": imported}, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
