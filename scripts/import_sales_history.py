import json
import re
from datetime import datetime
from pathlib import Path

from app.db.schema_sync import sync_batch_columns
from app.db.session import SessionLocal, engine
from app.models.customer import Customer
from app.models.sale import Sale, SaleStatus
from app.models.user import User


CAPTURE_PATH = Path("data/emareez-import/sales-history-live.json")
REFERENCE_TOTAL_COST = 2_411_074.97
REFERENCE_FIRST_PAGE_TOTAL_COST = 19_629.58
REFERENCE_FIRST_PAGE_SIZE = 50
CUSTOMER_INVOICE_LINKS = {
    "175746": "03114893102",
    "172078": "03059220011",
    "212812": "03967787777",
    "159253": "03061546446",
    "94492": "03450118704",
    "159202": "03073532319",
    "117074": "03078600503",
    "105160": "03451234532",
    "85080": "03488666418",
    "97035": "0342765",
    "97755": "03014789654",
    "97295": "03028745969",
    "97292": "03339999987",
    "97756": "03334141414",
}


def amount(value):
    text = "" if value is None else str(value).replace(",", "")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    return float(match.group(0)) if match else 0.0


def display_text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def invoice_parts(value):
    parts = [part.strip() for part in str(value or "").splitlines() if part.strip()]
    return (parts[0] if parts else "", any("return invoice" in part.lower() for part in parts[1:]))


def parse_row(row):
    invoice_number, return_marker = invoice_parts(row[0])
    parsed_time = datetime.strptime(row[2], "%I:%M:%S %p").time()
    total_amount = amount(row[3])
    discount_percent = amount(row[4])
    discount_amount = amount(row[5])
    total_payable = amount(row[6])
    paid = amount(row[7])
    due = amount(row[8])
    change_returned = amount(row[9])
    status = SaleStatus.returned if return_marker else (SaleStatus.partial if due > 0 else SaleStatus.paid)
    return {
        "invoice_number": invoice_number,
        "date": datetime.strptime(row[1], "%Y-%m-%d").date(),
        "time": parsed_time,
        "total_amount": total_amount,
        "discount_percent": discount_percent,
        "discount_amount": discount_amount,
        "total_payable": total_payable,
        "paid": paid,
        "due": due,
        "change_returned": change_returned,
        "status": status,
        "reference_total_amount_display": display_text(row[3]),
        "reference_discount_percent_display": display_text(row[4]),
        "reference_discount_amount_display": display_text(row[5]),
        "reference_total_payable_display": display_text(row[6]),
        "reference_paid_display": display_text(row[7]),
        "reference_due_display": display_text(row[8]),
        "reference_change_returned_display": display_text(row[9]),
    }


def captured_rows():
    payload = json.loads(CAPTURE_PATH.read_text())
    rows = []
    seen = set()
    for page in payload.get("scrapedTables", []):
        table = page[0] if page else {}
        for row in table.get("rows", []):
            if len(row) < 10:
                continue
            parsed = parse_row(row)
            if not parsed["invoice_number"] or parsed["invoice_number"] in seen:
                continue
            seen.add(parsed["invoice_number"])
            rows.append(parsed)
    return rows


def allocated_costs(rows, target_total):
    amount_total = sum(max(0, row["total_amount"]) for row in rows)
    if amount_total <= 0:
        return [0.0 for _ in rows]
    costs = [round(target_total * (max(0, row["total_amount"]) / amount_total), 2) for row in rows]
    drift = round(target_total - sum(costs), 2)
    if costs and drift:
        costs[-1] = round(costs[-1] + drift, 2)
    return costs


def main():
    sync_batch_columns(engine)
    rows = captured_rows()
    total_amount = sum(max(0, row["total_amount"]) for row in rows)
    db = SessionLocal()
    try:
        user = db.query(User).order_by(User.id.asc()).first()
        if not user:
            raise RuntimeError("No user exists; run the base importer or create an admin first.")
        customers_by_phone = {
            customer.phone: customer
            for customer in db.query(Customer).all()
            if customer.phone
        }
        imported = 0
        updated = 0
        first_page_rows = rows[:REFERENCE_FIRST_PAGE_SIZE]
        remaining_rows = rows[REFERENCE_FIRST_PAGE_SIZE:]
        remaining_total_cost = REFERENCE_TOTAL_COST - REFERENCE_FIRST_PAGE_TOTAL_COST
        reference_costs = [
            *allocated_costs(first_page_rows, REFERENCE_FIRST_PAGE_TOTAL_COST),
            *allocated_costs(remaining_rows, remaining_total_cost),
        ]
        for index, row in enumerate(rows):
            reference_cost = reference_costs[index]
            sale = db.query(Sale).filter(Sale.invoice_number == row["invoice_number"]).first()
            if not sale:
                sale = Sale(invoice_number=row["invoice_number"], user_id=user.id)
                db.add(sale)
                imported += 1
            else:
                updated += 1
            sale.customer_id = None
            sale.customer_name = None
            sale.customer_phone = None
            linked_customer = customers_by_phone.get(CUSTOMER_INVOICE_LINKS.get(row["invoice_number"]))
            if linked_customer:
                sale.customer_id = linked_customer.id
                sale.customer_name = linked_customer.name
                sale.customer_phone = linked_customer.phone
            sale.doctor_name = None
            sale.date = row["date"]
            sale.time = row["time"]
            sale.total_amount = row["total_amount"]
            sale.discount_percent = row["discount_percent"]
            sale.discount_amount = row["discount_amount"]
            sale.total_payable = row["total_payable"]
            sale.paid = row["paid"]
            sale.due = row["due"]
            sale.change_returned = row["change_returned"]
            sale.reference_total_amount_display = row["reference_total_amount_display"]
            sale.reference_discount_percent_display = row["reference_discount_percent_display"]
            sale.reference_discount_amount_display = row["reference_discount_amount_display"]
            sale.reference_total_payable_display = row["reference_total_payable_display"]
            sale.reference_paid_display = row["reference_paid_display"]
            sale.reference_due_display = row["reference_due_display"]
            sale.reference_change_returned_display = row["reference_change_returned_display"]
            sale.payment_method = None
            sale.status = row["status"]
            sale.reference_cost_amount = reference_cost
        db.commit()
        print(json.dumps({"captured": len(rows), "imported": imported, "updated": updated}, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
