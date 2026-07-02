import json
import re
import sys
from pathlib import Path

from app.db.schema_sync import sync_batch_columns
from app.db.session import SessionLocal, engine
from app.models.batch import Batch
from app.models.product import Product, ProductType
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.user import User


DEFAULT_CAPTURE_PATH = Path("reference-captures/emareez-saleshistory-detail-first20-current.json")
SUMMARY_PATH = Path("data/emareez-import/import-summary.json")


def clean(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u200b", " ")).strip()


def amount(value):
    text = clean(value).replace(",", "")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    return float(match.group(0)) if match else 0.0


def blank_amount(value):
    value = clean(value)
    return None if value in {"", "-"} else amount(value)


def find_product(db, product_name):
    name = clean(product_name)
    normalized = name.lower()
    existing = [
        product for product in db.query(Product).all()
        if clean(product.name).lower() == normalized
    ]
    if existing:
        return sorted(existing, key=lambda product: (product.reference_sort_order is None, product.id))[0]
    product = Product(name=name, type=ProductType.medical, status="active", local_visible=True)
    db.add(product)
    db.flush()
    return product


def find_batch(db, item, user):
    display_batch_no = clean(item["batchNo"])
    product = find_product(db, item["productName"])
    if display_batch_no:
        batch = db.query(Batch).filter(Batch.batch_no == display_batch_no).first()
        if batch:
            return batch
    elif product.batches:
        return product.batches[0]

    internal_batch_no = display_batch_no or f"sales-detail-{product.id}"
    suffix = 2
    unique_batch_no = internal_batch_no
    while db.query(Batch).filter(Batch.batch_no == unique_batch_no).first():
        unique_batch_no = f"{internal_batch_no}-{suffix}"
        suffix += 1
    rate = amount(item["rate"])
    batch = Batch(
        product_id=product.id,
        batch_no=unique_batch_no,
        stock_in=0,
        stock_out=0,
        stock_remaining=0,
        sell_price=rate,
        cost_price=rate,
        product_type=ProductType.medical.value,
        added_by=user.id if user else None,
        updated_by=user.id if user else None,
    )
    db.add(batch)
    db.flush()
    return batch


def table_with(headers, tables):
    wanted = set(headers)
    return next((table for table in tables if wanted.issubset(set(table.get("headers", [])))), None)


def table_with_any(required_headers, tables):
    wanted = set(required_headers)
    return next((table for table in tables if wanted.issubset(set(table.get("headers", [])))), None)


def row_value(headers, row, header, default=""):
    try:
        index = headers.index(header)
    except ValueError:
        return default
    return row[index] if index < len(row) else default


def fallback_summary_from_capture_row(row):
    # Sales History table row shape: invoice, date, time, total, discount %, discount amount,
    # total payable, paid, due, change returned, action.
    return {
        "date": row[1] if len(row) > 1 else "",
        "time": row[2] if len(row) > 2 else "",
        "salesInvoice": {
            "totalAmount": row[3] if len(row) > 3 else "0",
            "discountAmount": row[5] if len(row) > 5 else "0",
            "totalPayable": row[6] if len(row) > 6 else "0",
            "paid": row[7] if len(row) > 7 else "0",
            "due": row[8] if len(row) > 8 else "",
            "changeReturned": row[9] if len(row) > 9 else "0",
        },
    }


def capture_payloads(capture_path):
    payload = json.loads(capture_path.read_text())
    captures = payload.get("evalResults", {}).get("beforeClickFile", {}).get("captures", [])
    converted = []
    for capture in captures:
        tables = capture.get("tables", [])
        summary_table = table_with(["Date", "Time", "Total Amount", "Discount Amount", "Total Payable", "Paid", "Due(s)", "Change Returned"], tables)
        item_table = table_with(["Batch no.", "Product Name", "QTY Sold", "QTY Returned", "Rate/Sell Price", "Amount"], tables)
        if not summary_table or not item_table:
            continue
        if summary_table.get("rows"):
            summary = summary_table["rows"][0]
            date_value = summary[0]
            time_value = summary[1]
            sales_invoice = {
                "totalAmount": summary[2],
                "discountAmount": summary[3],
                "totalPayable": summary[4],
                "paid": summary[5],
                "due": summary[6],
                "changeReturned": summary[7],
            }
        else:
            fallback = fallback_summary_from_capture_row(capture.get("row") or [])
            date_value = fallback["date"]
            time_value = fallback["time"]
            sales_invoice = fallback["salesInvoice"]
        payload = {
            "invoiceNumber": clean(capture["invoiceNumber"]),
            "date": date_value,
            "time": time_value,
            "salesInvoice": sales_invoice,
            "items": [
                {
                    "batchNo": row[0] if len(row) > 0 else "",
                    "productName": row[1] if len(row) > 1 else "",
                    "qtySold": row[2] if len(row) > 2 else "0",
                    "qtyReturned": row[3] if len(row) > 3 else "-",
                    "rate": row[4] if len(row) > 4 else "0",
                    "amount": row[5] if len(row) > 5 else "0",
                }
                for row in item_table.get("rows", [])
            ],
        }
        return_table = table_with_any(["Date", "Returned Amount", "Returned Discount Amt(RS)"], tables)
        if return_table and return_table.get("rows"):
            row = return_table["rows"][0]
            headers = return_table.get("headers", [])
            payload["returnInvoice"] = {
                "returnedAmount": row_value(headers, row, "Returned Amount"),
                "returnedDiscountPercent": row_value(headers, row, "Returned Discount Amt(%)", "0"),
                "returnedDiscountPercentVisible": "Returned Discount Amt(%)" in headers,
                "returnedDiscountAmount": row_value(headers, row, "Returned Discount Amt(RS)"),
            }
        after_table = table_with(["Total Amount", "Net Paid"], tables)
        if after_table and after_table.get("rows"):
            row = after_table["rows"][0]
            payload["afterReturnSalesInvoice"] = {
                "totalAmount": row[0],
                "netPaid": row[1],
            }
        converted.append(payload)
    return converted


def import_payload(db, payload):
    invoice_number = clean(payload["invoiceNumber"])
    sale = db.query(Sale).filter(Sale.invoice_number == invoice_number).first()
    if not sale:
      raise RuntimeError(f"Sale invoice {invoice_number} is missing; run scripts/import_sales_history.py first.")
    user = db.query(User).order_by(User.id.asc()).first()
    sales_invoice = payload.get("salesInvoice") or payload.get("summary")
    if sales_invoice:
        due_text = clean(sales_invoice.get("due"))
        sale.reference_original_total_amount = amount(sales_invoice.get("totalAmount"))
        sale.reference_original_discount_amount = amount(sales_invoice.get("discountAmount"))
        sale.reference_original_total_payable = amount(sales_invoice.get("totalPayable"))
        sale.reference_original_paid = amount(sales_invoice.get("paid"))
        sale.reference_original_due = None if due_text == "" else amount(sales_invoice.get("due"))
        sale.reference_original_due_display = "" if due_text == "" else None
        sale.reference_original_change_returned = amount(sales_invoice.get("changeReturned"))
    return_invoice = payload.get("returnInvoice")
    if return_invoice:
        sale.reference_return_amount = amount(return_invoice.get("returnedAmount"))
        sale.reference_return_discount_percent = amount(return_invoice.get("returnedDiscountPercent"))
        sale.reference_return_discount_percent_visible = bool(return_invoice.get("returnedDiscountPercentVisible"))
        sale.reference_return_discount_amount = amount(return_invoice.get("returnedDiscountAmount"))
    after_return = payload.get("afterReturnSalesInvoice")
    if after_return:
        sale.reference_after_return_total_amount = amount(after_return.get("totalAmount"))
        sale.reference_after_return_net_paid = amount(after_return.get("netPaid"))

    existing_receipt_names = {
        (clean(item.product_name), clean(item.batch_no)): item.reference_receipt_name
        for item in db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
        if item.reference_receipt_name
    }
    db.query(SaleItem).filter(SaleItem.sale_id == sale.id).delete()
    imported = 0
    for item in payload.get("items", []):
        batch = find_batch(db, item, user)
        qty = amount(item.get("qtySold"))
        rate = amount(item.get("rate"))
        line_amount = amount(item.get("amount"))
        qty_returned = blank_amount(item.get("qtyReturned"))
        db.add(SaleItem(
            sale_id=sale.id,
            product_id=batch.product_id,
            batch_id=batch.id,
            product_name=clean(item.get("productName")),
            batch_no=clean(item.get("batchNo")),
            qt_in_box=0,
            qt_in_units=qty,
            total_qty=qty,
            cost_price=float(batch.cost_price or rate),
            rate=rate,
            amount=line_amount,
            discount_percent=0,
            discount_amount=0,
            payable_amount=line_amount,
            reference_qty_returned=qty_returned,
            reference_receipt_name=item.get("receiptName") or existing_receipt_names.get((clean(item.get("productName")), clean(item.get("batchNo")))),
        ))
        imported += 1
    detail_type = "return" if payload.get("returnInvoice") else "sales"
    return invoice_number, imported, detail_type


def update_summary(results):
    if not SUMMARY_PATH.exists():
        return
    summary = json.loads(SUMMARY_PATH.read_text())
    for invoice_number, result in results.items():
        key = "returnHistoryDetailRows" if result["type"] == "return" else "salesHistoryDetailRows"
        stale_key = "salesHistoryDetailRows" if key == "returnHistoryDetailRows" else "returnHistoryDetailRows"
        summary.setdefault(stale_key, {}).pop(invoice_number, None)
        summary.setdefault(key, {})[invoice_number] = result["items"]
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2) + "\n")


def main():
    sync_batch_columns(engine)
    capture_paths = [Path(path) for path in sys.argv[1:]] or [DEFAULT_CAPTURE_PATH]
    db = SessionLocal()
    try:
        results = {}
        for capture_path in capture_paths:
            for payload in capture_payloads(capture_path):
                invoice_number, imported, detail_type = import_payload(db, payload)
                results[invoice_number] = {"items": imported, "type": detail_type}
        db.commit()
        update_summary(results)
        print(json.dumps({"invoices": results}, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
