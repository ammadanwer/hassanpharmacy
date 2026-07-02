import json
import re
from datetime import datetime
from pathlib import Path

from app.db.session import Base, SessionLocal, engine
from app.models.reference_product_sale_invoice import ReferenceProductSaleInvoice


CAPTURE_PATH = Path("data/emareez-import/product-history-dopamine-live.json")
PRODUCT_NAME = "Dopamine"
DOSE = "200mg/5ml"
GENERIC_NAME = None


def clean(value):
    text = "" if value is None else str(value).replace("\u200b", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return None if text in {"", "-"} else text


def money(value):
    text = clean(value)
    if not text:
        return 0.0
    match = re.search(r"-?\d[\d,]*(?:\.\d+)?", text)
    return round(float(match.group(0).replace(",", "")), 2) if match else 0.0


def captured_rows():
    payload = json.loads(CAPTURE_PATH.read_text())
    tables = payload.get("scrapedTables", [[]])[0]
    detail_table = next((table for table in tables if table.get("headers", [None])[0] == "Invoice Number"), None)
    if not detail_table:
        return []
    rows = []
    for row in detail_table.get("rows", []):
        if len(row) < 9:
            continue
        invoice = clean(row[0])
        if not invoice:
            continue
        rows.append({
            "invoice_number": invoice,
            "date": datetime.strptime(row[1], "%Y-%m-%d").date(),
            "total_amount": money(row[2]),
            "discount_percent": money(row[3]),
            "discount_amount": money(row[4]),
            "total_payable": money(row[5]),
            "paid": money(row[6]),
            "due": money(row[7]),
            "change_returned": money(row[8]),
        })
    return rows


def main():
    Base.metadata.create_all(bind=engine)
    rows = captured_rows()
    db = SessionLocal()
    try:
        db.query(ReferenceProductSaleInvoice).filter(ReferenceProductSaleInvoice.product_name == PRODUCT_NAME, ReferenceProductSaleInvoice.dose == DOSE).delete()
        for index, row in enumerate(rows, start=1):
            db.add(ReferenceProductSaleInvoice(
                product_name=PRODUCT_NAME,
                dose=DOSE,
                generic_name=GENERIC_NAME,
                sort_order=index,
                **row,
            ))
        db.commit()
        print(json.dumps({"product": PRODUCT_NAME, "imported": len(rows)}, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
