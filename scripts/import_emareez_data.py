import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

from app.core.security import get_password_hash
from app.db.session import Base, SessionLocal, engine
from app.db.schema_sync import sync_batch_columns
from app.models.batch import Batch, BatchStatus
from app.models.category import Category, CategoryType
from app.models.customer import Customer
from app.models.expense import Expense
from app.models.expense_category import ExpenseCategory
from app.models.manufacturer import Manufacturer
from app.models.medicine_formula import MedicineFormula
from app.models.product import Product, ProductType
from app.models.reference_stock_purchase import ReferenceStockPurchase
from app.models.return_note import ReturnNote
from app.models.return_policy import ReturnPolicy
from app.models.shelf import Shelf
from app.models.supplier import Supplier
from app.models.user import User, UserRole

RAW_PATH = Path("data/emareez-import/raw-tables.json")
CUSTOMER_HISTORY_PATH = Path("live-capture/routes/customer-history.json")
STAFF_CAPTURE_PATH = Path("live-capture/routes/staff-management.json")
EXPENSE_CATEGORIES_CAPTURE_PATH = Path("data/emareez-import/expense-categories-live.json")
EXPENSES_CAPTURE_PATH = Path("data/emareez-import/expenses-live.json")
MEDICAL_PRODUCTS_CAPTURE_PATH = Path("data/emareez-import/products-medical-live.json")
NONMEDICAL_PRODUCTS_CAPTURE_PATH = Path("data/emareez-import/products-nonmedical-live.json")
STOCK_PURCHASES_CAPTURE_PATH = Path("data/emareez-import/stock-purchases-live.json")
SUPPLIERS_CAPTURE_PATH = Path("data/emareez-import/suppliers-live.json")
BATCHES_CAPTURE_PATH = Path("data/emareez-import/batches-live.json")
DEFAULT_IMPORTED_PASSWORD = "admin123"


def norm(value):
    value = "" if value is None else str(value)
    return re.sub(r"\s+", " ", value.replace("\u200b", " ")).strip()


def clean(value):
    value = norm(value)
    return None if value in {"", "-"} else value


def raw_cell(value):
    value = norm(value)
    return value or None


def clip(value, length=255):
    value = clean(value)
    return value[:length] if value else None


def clip_raw(value, length=255):
    value = raw_cell(value)
    return value[:length] if value else None


def money(value):
    value = clean(value)
    if not value:
        return None
    match = re.search(r"-?\d[\d,]*(?:\.\d+)?", value)
    return float(match.group(0).replace(",", "")) if match else None


def integer(value):
    parsed = money(value)
    return int(round(parsed)) if parsed is not None else 0


def date_value(value):
    value = clean(value)
    if not value:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            pass
    return None


def date_display(value):
    parsed = date_value(value)
    return parsed.isoformat() if parsed else ""


def key(value):
    return norm(value).lower()


def first_table(raw, name):
    tables = raw["pages"].get(name, {}).get("tables", [])
    return tables[0]["rows"] if tables else []


def get_or_create(db, model, name, **values):
    name = clip(name, 255)
    if not name:
        return None
    values = {field: clip(value, 500 if field in {"description", "address"} else 255) for field, value in values.items()}
    existing = db.query(model).filter(model.name.ilike(name)).first()
    if existing:
        for field, value in values.items():
            if getattr(existing, field, None) in (None, "", "-") and value not in (None, "", "-"):
                setattr(existing, field, value)
        return existing
    row = model(name=name, **values)
    db.add(row)
    db.flush()
    return row


def get_category(db, name, category_type):
    name = clip(name, 255)
    if not name:
        return None
    existing = db.query(Category).filter(Category.name.ilike(name)).first()
    if existing:
        return existing
    row = Category(name=name, type=category_type)
    db.add(row)
    db.flush()
    return row


def unique_batch_no(db, batch_no, used=None):
    base = clean(batch_no) or "imported"
    candidate = base
    index = 2
    used = used if used is not None else set()
    while candidate in used or db.query(Batch).filter(Batch.batch_no == candidate).first():
        candidate = f"{base}-{index}"
        index += 1
    used.add(candidate)
    return candidate


def import_categories(db, raw):
    rows = []
    for index, row in enumerate(first_table(raw, "categories"), start=1):
        if len(row) < 2:
            continue
        name = clip_raw(row[0], 255)
        if not name:
            continue
        category_type = CategoryType.non_medical if "non" in norm(row[1]).lower() else CategoryType.medical
        rows.append((index, name, category_type))
    existing_counts = Counter((norm(category.name), category.type) for category in db.query(Category).all())
    existing_by_signature = {}
    for category in db.query(Category).order_by(Category.id.asc()).all():
        existing_by_signature.setdefault((norm(category.name), category.type), []).append(category)
    seen_counts = Counter()
    for sort_order, name, category_type in rows:
        signature = (norm(name), category_type)
        seen_counts[signature] += 1
        if existing_counts[signature] >= seen_counts[signature]:
            existing_by_signature[signature][seen_counts[signature] - 1].reference_sort_order = sort_order
            continue
        db.add(Category(name=name, type=category_type, reference_sort_order=sort_order))
    return len(rows)


def import_formulas(db, raw):
    rows = []
    for index, row in enumerate(first_table(raw, "formulas"), start=1):
        name = clip_raw(row[0] if row else None, 255)
        if not name:
            continue
        rows.append((index, name, clip(row[1] if len(row) > 1 else None, 500)))
    existing_counts = Counter(
        (norm(formula.name), norm(formula.description)) for formula in db.query(MedicineFormula).all()
    )
    existing_by_signature = {}
    for formula in db.query(MedicineFormula).order_by(MedicineFormula.id.asc()).all():
        existing_by_signature.setdefault((norm(formula.name), norm(formula.description)), []).append(formula)
    seen_counts = Counter()
    for sort_order, name, description in rows:
        signature = (norm(name), norm(description))
        seen_counts[signature] += 1
        if existing_counts[signature] >= seen_counts[signature]:
            existing_by_signature[signature][seen_counts[signature] - 1].reference_sort_order = sort_order
            continue
        db.add(MedicineFormula(name=name, description=description, reference_sort_order=sort_order))
    return len(rows)


def prune_extra_formulas(db, raw):
    desired = []
    for row in first_table(raw, "formulas"):
        name = clip_raw(row[0] if row else None, 255)
        if not name:
            continue
        desired.append((norm(name), norm(clip(row[1] if len(row) > 1 else None, 500))))
    desired_counts = Counter(desired)
    seen_counts = Counter()
    extras = []
    for formula in db.query(MedicineFormula).order_by(MedicineFormula.id.asc()).all():
        signature = (norm(formula.name), norm(formula.description))
        seen_counts[signature] += 1
        if seen_counts[signature] > desired_counts[signature]:
            extras.append(formula)
    for formula in extras:
        for product in db.query(Product).filter(Product.formula_id == formula.id).all():
            if not product.medicine_formula:
                product.medicine_formula = formula.name
            product.formula_id = None
        db.delete(formula)
    return len(extras)


def import_manufacturers(db, raw):
    rows = []
    for index, row in enumerate(first_table(raw, "manufacturers"), start=1):
        name = clip_raw(row[0] if row else None, 255)
        if not name:
            continue
        rows.append((index, name))
    existing_counts = Counter(norm(manufacturer.name) for manufacturer in db.query(Manufacturer).all())
    existing_by_signature = {}
    for manufacturer in db.query(Manufacturer).order_by(Manufacturer.id.asc()).all():
        existing_by_signature.setdefault(norm(manufacturer.name), []).append(manufacturer)
    seen_counts = Counter()
    for sort_order, name in rows:
        signature = norm(name)
        seen_counts[signature] += 1
        if existing_counts[signature] >= seen_counts[signature]:
            existing_by_signature[signature][seen_counts[signature] - 1].reference_sort_order = sort_order
            continue
        db.add(Manufacturer(name=name, reference_sort_order=sort_order))
    return len(rows)


def import_shelves(db, raw):
    count = 0
    for row in first_table(raw, "shelves"):
        name = clean(row[0] if row else None)
        if not name:
            continue
        get_or_create(db, Shelf, name)
        count += 1
    return count


def supplier_capture_rows(raw):
    if SUPPLIERS_CAPTURE_PATH.exists():
        payload = json.loads(SUPPLIERS_CAPTURE_PATH.read_text())
        rows = []
        for page in payload.get("scrapedTables", []):
            for table in page:
                headers = [norm(header) for header in table.get("headers", [])]
                if headers[:4] == ["Supplier Name/Company", "Contact Person", "Phone#", "Email"]:
                    rows.extend(table.get("rows", []))
        if rows:
            return rows
    return first_table(raw, "suppliers")


def import_suppliers(db, raw):
    rows = []
    for index, row in enumerate(supplier_capture_rows(raw), start=1):
        if len(row) < 4:
            continue
        name = clip_raw(row[0], 255)
        if not name:
            continue
        rows.append((
            index,
            name,
            clip(row[1], 255),
            clip(row[2], 50),
            clip(row[3], 255),
            integer(row[4]) if clean(row[4]) else None,
            money(row[5]),
            money(row[6]),
            money(row[7]),
            clip(row[8], 50) if len(row) > 8 else None,
        ))
    existing = db.query(Supplier).all()
    existing_counts = Counter((norm(row.name), norm(row.contact_person), norm(row.phone), norm(row.email)) for row in existing)
    existing_by_signature = {}
    for supplier in existing:
        signature = (norm(supplier.name), norm(supplier.contact_person), norm(supplier.phone), norm(supplier.email))
        existing_by_signature.setdefault(signature, []).append(supplier)
    seen_counts = Counter()
    active_reference_ids = set()
    for sort_order, name, contact_person, phone, email, total_batches, stock_purchase_price, paid_amount, supplier_outstanding, payment_status in rows:
        signature = (norm(name), norm(contact_person), norm(phone), norm(email))
        seen_counts[signature] += 1
        if existing_counts[signature] >= seen_counts[signature]:
            supplier = existing_by_signature[signature][seen_counts[signature] - 1]
            supplier.status = "active"
            supplier.reference_sort_order = sort_order
        else:
            supplier = Supplier(name=name, contact_person=contact_person, phone=phone, email=email, status="active", reference_sort_order=sort_order)
            db.add(supplier)
            db.flush()
        active_reference_ids.add(supplier.id)
        supplier.reference_total_batches = total_batches
        supplier.reference_stock_purchase_price = stock_purchase_price
        supplier.reference_paid_amount = paid_amount
        supplier.reference_supplier_outstanding = supplier_outstanding
        supplier.reference_payment_status = payment_status
    for supplier in db.query(Supplier).filter(Supplier.reference_sort_order.is_not(None)).all():
        if supplier.id not in active_reference_ids:
            supplier.status = "inactive"
    return len(rows)


def import_customers(db):
    if not CUSTOMER_HISTORY_PATH.exists():
        return 0
    capture = json.loads(CUSTOMER_HISTORY_PATH.read_text())
    body = norm(capture.get("body", ""))
    match = re.search(r"Actions (?P<rows>.+?) < BACK", body)
    if not match:
        return 0
    count = 0
    for row_match in re.finditer(r"(?P<name>.+?) (?P<phone>03\d+) (?P<due>\d+(?:\.\d+)?)", match.group("rows")):
        name = clip(row_match.group("name"), 255)
        phone = clip(row_match.group("phone"), 50)
        due_amount = money(row_match.group("due")) or 0
        if not name or not phone:
            continue
        existing = db.query(Customer).filter(Customer.phone == phone).first()
        if existing:
            existing.name = name
            existing.due_amount = due_amount
        else:
            db.add(Customer(name=name, phone=phone, due_amount=due_amount))
        count += 1
    return count


def import_staff(db):
    if not STAFF_CAPTURE_PATH.exists():
        return 0
    capture = json.loads(STAFF_CAPTURE_PATH.read_text())
    body = norm(capture.get("body", ""))
    match = re.search(r"Actions (?P<rows>.+?) Add New Sale", body)
    if not match:
        return 0
    role_map = {
        "Manager": UserRole.manager,
        "Pharmacist": UserRole.pharmacist,
        "Stock_manager": UserRole.stock_manager,
        "Technician": UserRole.technician,
    }
    row_pattern = re.compile(
        r"(?P<name>.+?) (?P<role>Manager|Pharmacist|Stock_manager|Technician) "
        r"(?P<phone>\d+) (?P<address>.*?) (?P<email>[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})"
    )
    count = 0
    default_password_hash = get_password_hash(DEFAULT_IMPORTED_PASSWORD)
    for row_match in row_pattern.finditer(match.group("rows")):
        email = clip(row_match.group("email"), 255)
        name = clip(row_match.group("name"), 255)
        if not email:
            continue
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=name or email,
                email=email,
                role=role_map[row_match.group("role")],
                phone=clip(row_match.group("phone"), 50),
                address=clip(row_match.group("address"), 500),
                hashed_password=default_password_hash,
                is_active=True,
            )
            db.add(user)
            db.flush()
        user.name = name or user.name
        user.role = role_map[row_match.group("role")]
        user.phone = clip(row_match.group("phone"), 50)
        user.address = clip(row_match.group("address"), 500)
        user.is_active = True
        if not user.sales_pin_hash:
            user.sales_pin_hash = get_password_hash("123")
        count += 1
    return count


def import_expense_categories(db):
    if not EXPENSE_CATEGORIES_CAPTURE_PATH.exists():
        return 0
    capture = json.loads(EXPENSE_CATEGORIES_CAPTURE_PATH.read_text())
    rows = []
    for page in capture.get("scrapedTables", []):
        table = page[0] if page else {}
        for row in table.get("rows", []):
            name = clip_raw(row[0] if row else None, 255)
            if not name:
                continue
            rows.append((len(rows) + 1, name, clip_raw(row[1] if len(row) > 1 else None, 500)))
    existing_counts = Counter(
        (norm(category.name), norm(category.description)) for category in db.query(ExpenseCategory).all()
    )
    existing_by_signature = {}
    for category in db.query(ExpenseCategory).order_by(ExpenseCategory.id.asc()).all():
        existing_by_signature.setdefault((norm(category.name), norm(category.description)), []).append(category)
    seen_counts = Counter()
    for sort_order, name, description in rows:
        signature = (norm(name), norm(description))
        seen_counts[signature] += 1
        if existing_counts[signature] >= seen_counts[signature]:
            existing_by_signature[signature][seen_counts[signature] - 1].reference_sort_order = sort_order
            continue
        db.add(ExpenseCategory(name=name, description=description, reference_sort_order=sort_order))
    return len(rows)


def parse_display_date(value):
    value = clean(value)
    if not value:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def parse_money(value):
    value = norm(value).replace("PKR", "").replace(",", "").strip()
    if not value:
        return 0
    return float(value)


def import_expenses(db):
    if not EXPENSES_CAPTURE_PATH.exists():
        return 0
    capture = json.loads(EXPENSES_CAPTURE_PATH.read_text())
    rows = []
    for page in capture.get("scrapedTables", []):
        table = page[0] if page else {}
        for row in table.get("rows", []):
            if len(row) < 4:
                continue
            expense_date = parse_display_date(row[0])
            name = clip_raw(row[1], 255)
            category_name = raw_cell(row[2])
            amount = parse_money(row[3])
            if not expense_date or not name or not category_name:
                continue
            rows.append((expense_date, name, category_name, amount))
    if not rows:
        return 0
    categories = db.query(ExpenseCategory).order_by(ExpenseCategory.reference_sort_order.is_(None), ExpenseCategory.reference_sort_order.asc(), ExpenseCategory.id.asc()).all()
    category_by_exact_name = {norm(category.name): category for category in categories}
    category_by_lower_name = {}
    for category in categories:
        category_by_lower_name.setdefault(norm(category.name).lower(), category)
    created_by_row = db.query(User.id).order_by(User.id.asc()).first()
    created_by = created_by_row[0] if created_by_row else None
    if not created_by:
        password_hash = get_password_hash(DEFAULT_IMPORTED_PASSWORD)
        admin = User(
            name="Hassan Pharmacy",
            email="admin@hassanpharmacy.test.com",
            role=UserRole.admin,
            hashed_password=password_hash,
            is_active=True,
        )
        db.add(admin)
        db.flush()
        created_by = admin.id
    existing = {}
    for expense in db.query(Expense).all():
        existing.setdefault((expense.date, norm(expense.name).lower(), float(expense.expense_amount or 0)), []).append(expense)
    imported = 0
    for expense_date, name, category_name, amount in rows:
        category = category_by_exact_name.get(norm(category_name)) or category_by_lower_name.get(norm(category_name).lower())
        if not category:
            category = ExpenseCategory(name=category_name)
            db.add(category)
            db.flush()
            category_by_exact_name[norm(category.name)] = category
            category_by_lower_name.setdefault(norm(category.name).lower(), category)
        signature = (expense_date, norm(name).lower(), float(amount))
        existing_expense = next((expense for expense in existing.get(signature, []) if norm(expense.expense_category_name).lower() == norm(category_name).lower()), None)
        if existing_expense:
            existing_expense.expense_category_id = category.id
            continue
        db.add(Expense(date=expense_date, name=name, expense_category_id=category.id, expense_amount=amount, created_by=created_by))
        existing.setdefault(signature, [])
        imported += 1
    return len(rows)


def captured_table_rows(path, min_columns):
    if path.exists():
        capture = json.loads(path.read_text())
        rows = []
        for page in capture.get("scrapedTables", []):
            table = page[0] if page else {}
            rows.extend(table.get("rows", []))
    else:
        raw = json.loads(RAW_PATH.read_text())
        key_name = "medicalProducts" if "medical" in path.name and "nonmedical" not in path.name else "nonMedicalProducts"
        rows = first_table(raw, key_name)
    return [row for row in rows if len(row) >= min_columns and clean(row[0]) and row[0] != "No Data Found"]


def assign_reference_product(product, sort_order, product_type, row):
    product.type = product_type
    product.status = "active"
    product.reference_sort_order = sort_order
    if product_type == ProductType.medical:
        product.reference_formula_name = clip(row[1], 255)
        product.dose = clip(row[2], 100)
        product.reference_total_quantity = integer(row[3])
        product.reference_remaining_quantity = integer(row[4])
        product.reference_generic_name = clip(row[5], 255)
        product.reference_category_name = clip(row[6], 255)
        product.reference_manufacturer_name = clip(row[7], 255)
        product.medicine_formula = product.reference_formula_name
        product.generic_name = product.reference_generic_name
    else:
        product.reference_brand_name = clip(row[1], 255)
        product.reference_category_name = clip(row[2], 255)
        product.reference_total_quantity = integer(row[3])
        product.reference_remaining_quantity = integer(row[4])
        product.brand_name = product.reference_brand_name


def import_reference_products(db):
    imported = {}
    for product_type, path, min_columns in (
        (ProductType.medical, MEDICAL_PRODUCTS_CAPTURE_PATH, 8),
        (ProductType.non_medical, NONMEDICAL_PRODUCTS_CAPTURE_PATH, 5),
    ):
        rows = captured_table_rows(path, min_columns)
        existing_by_name = {}
        for product in db.query(Product).filter(Product.type == product_type).order_by(Product.id.asc()).all():
            existing_by_name.setdefault(norm(product.name), []).append(product)
            product.reference_sort_order = None
        seen = Counter()
        for sort_order, row in enumerate(rows, start=1):
            name = clip_raw(row[0], 255)
            if not name:
                continue
            signature = norm(name)
            seen[signature] += 1
            matches = existing_by_name.get(signature, [])
            if len(matches) >= seen[signature]:
                product = matches[seen[signature] - 1]
            else:
                product = Product(name=name, type=product_type, status="active", local_visible=False)
                db.add(product)
                db.flush()
                existing_by_name.setdefault(signature, []).append(product)
            assign_reference_product(product, sort_order, product_type, row)
        imported[product_type.value] = len(rows)
    return imported


def stock_purchase_cell(row, index):
    return raw_cell(row[index] if len(row) > index else None) or ""


def import_stock_purchases(db):
    capture = json.loads(STOCK_PURCHASES_CAPTURE_PATH.read_text())
    rows = []
    for page in capture.get("scrapedTables", []):
        table = page[0] if page else {}
        for row in table.get("rows", []):
            if len(row) >= 12 and clean(row[1]) and row[0] != "Batch No.":
                rows.append(row)
    db.query(ReferenceStockPurchase).delete()
    for sort_order, row in enumerate(rows, start=1):
        db.add(ReferenceStockPurchase(
            sort_order=sort_order,
            batch_no=raw_cell(row[0] if len(row) > 0 else None) or "",
            medicine_name=stock_purchase_cell(row, 1),
            quantity=stock_purchase_cell(row, 2),
            rate=stock_purchase_cell(row, 3),
            total_amount=stock_purchase_cell(row, 4),
            extra_discount_bonus=stock_purchase_cell(row, 5),
            purchase_date=stock_purchase_cell(row, 6),
            stock_cost_price=stock_purchase_cell(row, 7),
            sales_tax=stock_purchase_cell(row, 8),
            invoice_id=raw_cell(row[9] if len(row) > 9 else None) or "",
            expire_date=stock_purchase_cell(row, 10),
            supplier_name=stock_purchase_cell(row, 11),
        ))
    return len(rows)


def import_medical_products(db, raw):
    count = 0
    for row in first_table(raw, "medicalProducts"):
        if len(row) < 8:
            continue
        name = clean(row[0])
        if not name:
            continue
        formula = get_or_create(db, MedicineFormula, row[1])
        category = get_category(db, row[6], CategoryType.medical)
        manufacturer = get_or_create(db, Manufacturer, row[7])
        product = db.query(Product).filter(Product.name.ilike(name), Product.type == ProductType.medical).first()
        if not product:
            product = Product(name=name, type=ProductType.medical)
            db.add(product)
            db.flush()
        product.formula_id = formula.id if formula else product.formula_id
        product.medicine_formula = formula.name if formula else clip(row[1], 255)
        product.dose = clip(row[2], 100)
        product.generic_name = clip(row[5], 255)
        product.category_id = category.id if category else product.category_id
        product.manufacturer_id = manufacturer.id if manufacturer else product.manufacturer_id
        product.status = "active"
        count += 1
    return count


def import_nonmedical_products(db, raw):
    count = 0
    for row in first_table(raw, "nonMedicalProducts"):
        if len(row) < 5:
            continue
        name = clean(row[0])
        if not name:
            continue
        manufacturer = get_or_create(db, Manufacturer, row[1])
        category = get_category(db, row[2], CategoryType.non_medical)
        product = db.query(Product).filter(Product.name.ilike(name), Product.type == ProductType.non_medical).first()
        if not product:
            product = Product(name=name, type=ProductType.non_medical)
            db.add(product)
            db.flush()
        product.manufacturer_id = manufacturer.id if manufacturer else product.manufacturer_id
        product.brand_name = manufacturer.name if manufacturer else clip(row[1], 255)
        product.category_id = category.id if category else product.category_id
        product.status = "active"
        count += 1
    return count


def product_for_batch(db, product_name, formula_name):
    name = clean(product_name)
    if not name:
        return None
    product = db.query(Product).filter(Product.name.ilike(name)).first()
    if product:
        return product
    normalized_name = norm(name)
    for candidate in db.query(Product).filter(Product.type == ProductType.medical).all():
        display_name = norm(f"{candidate.name or ''} {candidate.dose or ''}")
        if display_name and display_name == normalized_name:
            return candidate
    product_type = ProductType.medical if clean(formula_name) else ProductType.non_medical
    product = Product(name=name, type=product_type, status="active")
    if clean(formula_name):
        formula = get_or_create(db, MedicineFormula, formula_name)
        product.formula_id = formula.id if formula else None
        product.medicine_formula = clip(formula_name, 255)
    db.add(product)
    db.flush()
    return product


def batch_capture_rows(raw):
    if BATCHES_CAPTURE_PATH.exists():
        payload = json.loads(BATCHES_CAPTURE_PATH.read_text())
        rows = []
        for page in payload.get("scrapedTables", []):
            for table in page:
                headers = [norm(header) for header in table.get("headers", [])]
                if headers[:3] == ["Batch No.", "Shelf No.", "Name"]:
                    rows.extend(table.get("rows", []))
        if rows:
            return rows
    return first_table(raw, "batches")


def base_batch_no(value):
    return re.sub(r"-\d+$", "", norm(value))


def import_batches(db, raw):
    count = 0
    used_batch_numbers = {row.batch_no for row in db.query(Batch.batch_no).all()}
    existing_by_signature = {}
    for batch in db.query(Batch).all():
        signature = (
            base_batch_no(batch.reference_batch_no or batch.batch_no),
            norm(batch.product_name),
            date_display(batch.expire_date),
            str(int(batch.stock_in or 0)),
            str(int(batch.stock_out or 0)),
        )
        existing_by_signature.setdefault(signature, []).append(batch)
    seen_counts = Counter()
    active_reference_ids = set()
    for sort_order, row in enumerate(batch_capture_rows(raw), start=1):
        if len(row) < 19 or key(row[0]) == "total":
            continue
        product = product_for_batch(db, row[2], row[3])
        if not product:
            continue
        shelf = get_or_create(db, Shelf, row[1])
        supplier = get_or_create(db, Supplier, row[15])
        reference_batch_no = clip_raw(row[0], 100) or ""
        signature = (
            base_batch_no(reference_batch_no),
            norm(row[2]),
            date_display(row[13]),
            str(integer(row[4])),
            str(integer(row[5])),
        )
        seen_counts[signature] += 1
        existing_matches = existing_by_signature.get(signature, [])
        batch = existing_matches[seen_counts[signature] - 1] if len(existing_matches) >= seen_counts[signature] else None
        if not batch:
            batch_no = unique_batch_no(db, reference_batch_no or "imported", used_batch_numbers)
            batch = Batch(batch_no=batch_no, product_id=product.id)
            db.add(batch)
            db.flush()
        sell_price = money(row[9])
        cost_price = money(row[10])
        batch.product_id = product.id
        batch.shelf_id = shelf.id if shelf else None
        batch.stock_in = integer(row[4])
        batch.stock_out = integer(row[5])
        batch.stock_remaining = integer(row[6])
        batch.purchase_price = money(row[7])
        batch.purchase_price_before_tax = money(row[8])
        batch.sell_price = sell_price
        batch.cost_price = cost_price
        batch.total_cost = money(row[11])
        batch.production_date = date_value(row[12])
        batch.expire_date = date_value(row[13])
        batch.supplier_id = supplier.id if supplier else None
        batch.paid_amount = money(row[16])
        batch.supplier_outstanding = money(row[17])
        batch.supplier_invoice_no = clip(row[18], 100)
        batch.product_type = product.type.value if hasattr(product.type, "value") else str(product.type)
        batch.reference_batch_no = reference_batch_no
        batch.reference_sort_order = sort_order
        batch.reference_created_at = date_value(row[14])
        batch.reference_product_name = clip_raw(row[2], 255)
        batch.reference_medicine_formula = clip_raw(row[3], 255)
        batch.reference_sell_price_display = clip_raw(row[9], 255)
        batch.reference_cost_price_display = clip_raw(row[10], 255)
        batch.status = BatchStatus.active
        active_reference_ids.add(batch.id)
        count += 1
    for batch in db.query(Batch).filter(Batch.status == BatchStatus.active).all():
        if batch.id not in active_reference_ids:
            batch.status = BatchStatus.reported
    return count


def import_return_policy(db, raw):
    page = raw["pages"].get("returnPolicy", {})
    tables = page.get("tables", [])
    policies = 0
    notes = 0
    if tables:
        for row in tables[0].get("rows", []):
            description = clip(row[0] if row else None, 2000)
            if description and not db.query(ReturnPolicy).filter(ReturnPolicy.description == description).first():
                db.add(ReturnPolicy(description=description))
                policies += 1
    if len(tables) > 1:
        for row in tables[1].get("rows", []):
            if len(row) < 2:
                continue
            title = clip(row[0], 255)
            description = clip(row[1], 2000)
            if title and not db.query(ReturnNote).filter(ReturnNote.title == title).first():
                db.add(ReturnNote(title=title, description=description))
                notes += 1
    return {"returnPolicies": policies, "returnNotes": notes}


def import_setup_lists(db, raw):
    summary = {
        "categories": import_categories(db, raw),
        "formulas": import_formulas(db, raw),
        "manufacturers": import_manufacturers(db, raw),
        "suppliers": import_suppliers(db, raw),
    }
    prune_extra_formulas(db, raw)
    return summary


def main():
    raw = json.loads(RAW_PATH.read_text())
    Base.metadata.create_all(bind=engine)
    sync_batch_columns(engine)
    db = SessionLocal()
    try:
        targeted_imports = {
            "customers": ("customers", import_customers),
            "staff": ("staff", import_staff),
            "suppliers": ("suppliers", lambda db: import_suppliers(db, raw)),
            "expense-categories": ("expenseCategories", import_expense_categories),
            "expenses": ("expenses", import_expenses),
            "reference-products": ("referenceProducts", import_reference_products),
            "stock-purchases": ("stockPurchases", import_stock_purchases),
            "batches": ("batches", lambda db: import_batches(db, raw)),
        }
        if len(sys.argv) == 3 and sys.argv[1] == "--only" and sys.argv[2] == "setup-lists":
            summary = import_setup_lists(db, raw)
            db.commit()
            if Path("data/emareez-import/import-summary.json").exists():
                existing = json.loads(Path("data/emareez-import/import-summary.json").read_text())
                existing.update(summary)
                summary = existing
            Path("data/emareez-import/import-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
            print(json.dumps({key: summary[key] for key in ("categories", "formulas", "manufacturers", "suppliers")}, indent=2))
            return
        if len(sys.argv) == 3 and sys.argv[1] == "--only" and sys.argv[2] in targeted_imports:
            only = sys.argv[2]
            summary_key, import_fn = targeted_imports[only]
            summary = {summary_key: import_fn(db)}
            db.commit()
            if Path("data/emareez-import/import-summary.json").exists():
                existing = json.loads(Path("data/emareez-import/import-summary.json").read_text())
                existing.pop(only, None)
                existing.update(summary)
                summary = existing
            Path("data/emareez-import/import-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
            print(json.dumps({summary_key: summary[summary_key]}, indent=2))
            return
        summary = {
            "categories": import_categories(db, raw),
            "formulas": import_formulas(db, raw),
            "manufacturers": import_manufacturers(db, raw),
            "shelves": import_shelves(db, raw),
            "suppliers": import_suppliers(db, raw),
            "customers": import_customers(db),
            "staff": import_staff(db),
            "expenseCategories": import_expense_categories(db),
            "expenses": import_expenses(db),
            "referenceProducts": import_reference_products(db),
            "stockPurchases": import_stock_purchases(db),
            "medicalProducts": import_medical_products(db, raw),
            "nonMedicalProducts": import_nonmedical_products(db, raw),
            "batches": import_batches(db, raw),
        }
        summary.update(import_return_policy(db, raw))
        db.commit()
        Path("data/emareez-import/import-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
        print(json.dumps(summary, indent=2))
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
