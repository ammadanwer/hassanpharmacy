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


DEFAULT_CAPTURE_PATH = Path("data/emareez-import/sales-detail-invoice-62.json")
SUMMARY_PATH = Path("data/emareez-import/import-summary.json")


def amount(value):
    text = "" if value is None else str(value).replace(",", "")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    return float(match.group(0)) if match else 0.0


def find_product(db, product_name):
    normalized = product_name.strip().lower()
    products = db.query(Product).all()
    exact = [product for product in products if product.name.strip().lower() == normalized]
    if exact:
        return sorted(exact, key=lambda product: (product.reference_sort_order is None, product.id))[0]
    product = Product(name=product_name.strip(), type=ProductType.medical, status="active")
    db.add(product)
    db.flush()
    return product


def find_batch(db, item, user):
    batch_no = str(item["batchNo"]).strip()
    batch = db.query(Batch).filter(Batch.batch_no == batch_no).first()
    if batch:
        return batch
    product = find_product(db, item["productName"])
    rate = amount(item["rate"])
    batch = Batch(
        product_id=product.id,
        batch_no=batch_no,
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


def import_capture(db, capture_path: Path):
    payload = json.loads(capture_path.read_text())
    invoice_number = str(payload["invoiceNumber"]).strip()
    sale = db.query(Sale).filter(Sale.invoice_number == invoice_number).first()
    if not sale:
        raise RuntimeError(f"Sale invoice {invoice_number} is missing; run scripts/import_sales_history.py first.")
    user = db.query(User).order_by(User.id.asc()).first()
    sales_invoice = payload.get("salesInvoice") or payload.get("summary")
    if sales_invoice:
        due_text = str(sales_invoice.get("due") or "").strip()
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
        sale.reference_return_discount_amount = amount(return_invoice.get("returnedDiscountAmount"))
    after_return = payload.get("afterReturnSalesInvoice")
    if after_return:
        sale.reference_after_return_total_amount = amount(after_return.get("totalAmount"))
        sale.reference_after_return_net_paid = amount(after_return.get("netPaid"))
    db.query(SaleItem).filter(SaleItem.sale_id == sale.id).delete()
    imported = 0
    for item in payload["items"]:
        batch = find_batch(db, item, user)
        qty = amount(item["qtySold"])
        rate = amount(item["rate"])
        line_amount = amount(item["amount"])
        qty_returned = None if str(item.get("qtyReturned", "")).strip() in {"", "-"} else amount(item.get("qtyReturned"))
        db.add(SaleItem(
            sale_id=sale.id,
            product_id=batch.product_id,
            batch_id=batch.id,
            product_name=item["productName"].strip(),
            batch_no=str(item["batchNo"]).strip(),
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
            reference_receipt_name=item.get("receiptName"),
        ))
        imported += 1
    detail_type = "return" if payload.get("returnInvoice") else "sales"
    return invoice_number, imported, detail_type


def update_summary(results):
    if not SUMMARY_PATH.exists():
        return
    summary = json.loads(SUMMARY_PATH.read_text())
    for invoice_number, result in results.items():
        imported = result["items"]
        key = "returnHistoryDetailRows" if result["type"] == "return" else "salesHistoryDetailRows"
        summary.setdefault(key, {})[invoice_number] = imported
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2) + "\n")


def main():
    sync_batch_columns(engine)
    capture_paths = [Path(path) for path in sys.argv[1:]] or [DEFAULT_CAPTURE_PATH]
    db = SessionLocal()
    try:
        results = {}
        for capture_path in capture_paths:
            invoice_number, imported, detail_type = import_capture(db, capture_path)
            results[invoice_number] = {"items": imported, "type": detail_type}
        db.commit()
        update_summary(results)
        print(json.dumps({"invoices": results}, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
