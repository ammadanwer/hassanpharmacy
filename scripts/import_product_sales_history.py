import json
import re
from pathlib import Path

from app.db.session import Base, SessionLocal, engine
from app.models.reference_product_sale import ReferenceProductSale


CAPTURE_PATH = Path("data/emareez-import/product-sales-history-live.json")


def clean(value):
    text = "" if value is None else str(value).replace("\u200b", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return None if text in {"", "-"} else text


def integer(value):
    parsed = clean(value)
    if not parsed:
        return 0
    match = re.search(r"-?\d[\d,]*(?:\.\d+)?", parsed)
    return int(round(float(match.group(0).replace(",", "")))) if match else 0


def captured_rows():
    payload = json.loads(CAPTURE_PATH.read_text())
    rows = []
    for page in payload.get("scrapedTables", []):
        table = page[0] if page else {}
        for row in table.get("rows", []):
            if len(row) < 4:
                continue
            rows.append({
                "product_name": clean(row[0]) or "",
                "dose": clean(row[1]),
                "generic_name": clean(row[2]),
                "sold_quantity": integer(row[3]),
            })
    return rows


def main():
    Base.metadata.create_all(bind=engine)
    rows = captured_rows()
    db = SessionLocal()
    try:
        db.query(ReferenceProductSale).delete()
        for index, row in enumerate(rows, start=1):
            db.add(ReferenceProductSale(sort_order=index, **row))
        db.commit()
        print(json.dumps({"imported": len(rows)}, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
