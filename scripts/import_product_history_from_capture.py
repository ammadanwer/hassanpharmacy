import json
import re
import sys
from datetime import datetime
from pathlib import Path

from app.db.session import Base, SessionLocal, engine
from app.models.reference_product_sale_invoice import ReferenceProductSaleInvoice


SUMMARY_PATH = Path("data/emareez-import/import-summary.json")


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


def capture_payload(path):
    payload = json.loads(path.read_text())
    result = payload.get("evalResults", {}).get("beforeClickFile", {})
    search_state = next((state for state in result.get("states", []) if state.get("label") == "search-results"), {})
    product_row = (search_state.get("tables") or [{}])[0].get("rows", [[]])[0]
    product_name = clean(product_row[0] if len(product_row) > 0 else None)
    dose = clean(product_row[1] if len(product_row) > 1 else None)
    generic_name = clean(product_row[2] if len(product_row) > 2 else None)
    rows = []
    for page in result.get("modalPages", []):
        table = page.get("table") or {}
        for row in table.get("rows", []):
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
    return product_name, dose, generic_name, rows


def update_summary(product_name, dose, imported):
    if not SUMMARY_PATH.exists():
        return
    summary = json.loads(SUMMARY_PATH.read_text())
    key = " ".join(part for part in [product_name, dose] if part)
    summary.setdefault("productHistoryDetailRows", {})[key] = imported
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2) + "\n")


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/import_product_history_from_capture.py <capture.json>")
    capture_path = Path(sys.argv[1])
    product_name, dose, generic_name, rows = capture_payload(capture_path)
    if not product_name:
        raise RuntimeError(f"Could not infer product name from {capture_path}")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        query = db.query(ReferenceProductSaleInvoice).filter(ReferenceProductSaleInvoice.product_name == product_name)
        if dose:
            query = query.filter(ReferenceProductSaleInvoice.dose == dose)
        else:
            query = query.filter(ReferenceProductSaleInvoice.dose.is_(None))
        query.delete()
        for index, row in enumerate(rows, start=1):
            db.add(ReferenceProductSaleInvoice(
                product_name=product_name,
                dose=dose,
                generic_name=generic_name,
                sort_order=index,
                **row,
            ))
        db.commit()
        update_summary(product_name, dose, len(rows))
        print(json.dumps({"product": product_name, "dose": dose, "imported": len(rows)}, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
