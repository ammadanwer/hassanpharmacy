import os

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError


BATCH_COLUMNS = {
    "product_type": "VARCHAR(30)",
    "barcode": "VARCHAR(100)",
    "box_quantity": "INTEGER",
    "units_per_box": "INTEGER",
    "items_per_unit": "INTEGER",
    "price_basis": "VARCHAR(20)",
    "entered_cost_price": "NUMERIC(12, 2)",
    "entered_sell_price": "NUMERIC(12, 2)",
    "cost_price_per_box": "NUMERIC(12, 2)",
    "boxes_price": "NUMERIC(12, 2)",
    "stock_purchase_price_before_discount": "NUMERIC(14, 2)",
    "discount_percentage": "NUMERIC(6, 2)",
    "batch_discount": "NUMERIC(12, 2)",
    "tax_percentage": "NUMERIC(6, 2)",
    "tax_amount": "NUMERIC(12, 2)",
    "purchasing_method": "VARCHAR(50)",
    "max_discount_percentage": "NUMERIC(6, 2)",
    "batch_purchase_date": "DATE",
    "expiry_reminder": "VARCHAR(100)",
    "stock_out_reminder": "VARCHAR(100)",
    "reference_batch_no": "VARCHAR(100)",
    "reference_sort_order": "INTEGER",
    "reference_created_at": "DATE",
    "reference_product_name": "VARCHAR(255)",
    "reference_medicine_formula": "VARCHAR(255)",
    "reference_sell_price_display": "VARCHAR(255)",
    "reference_cost_price_display": "VARCHAR(255)",
}

PRODUCT_COLUMNS = {
    "barcode": "VARCHAR(100)",
    "unit": "VARCHAR(50)",
    "weight": "VARCHAR(100)",
    "prescription_required": "BOOLEAN NOT NULL DEFAULT FALSE",
    "status": "VARCHAR(30) NOT NULL DEFAULT 'active'",
    "local_visible": "BOOLEAN NOT NULL DEFAULT FALSE",
    "reference_sort_order": "INTEGER",
    "reference_formula_name": "VARCHAR(255)",
    "reference_brand_name": "VARCHAR(255)",
    "reference_category_name": "VARCHAR(255)",
    "reference_manufacturer_name": "VARCHAR(255)",
    "reference_generic_name": "VARCHAR(255)",
    "reference_total_quantity": "INTEGER",
    "reference_remaining_quantity": "INTEGER",
}

SUPPLIER_COLUMNS = {
    "status": "VARCHAR(30) NOT NULL DEFAULT 'active'",
    "reference_sort_order": "INTEGER",
    "reference_total_batches": "INTEGER",
    "reference_stock_purchase_price": "NUMERIC(14, 2)",
    "reference_paid_amount": "NUMERIC(14, 2)",
    "reference_supplier_outstanding": "NUMERIC(14, 2)",
    "reference_payment_status": "VARCHAR(50)",
}

REFERENCE_SORT_COLUMNS = {
    "reference_sort_order": "INTEGER",
}

USER_COLUMNS = {
    "gender": "VARCHAR(30)",
    "sales_pin_hash": "VARCHAR(255)",
    "permissions": "JSON",
}

SHIFT_COLUMNS = {
    "start_period": "VARCHAR(2) NOT NULL DEFAULT 'AM'",
    "end_period": "VARCHAR(2) NOT NULL DEFAULT 'AM'",
    "off_days": "VARCHAR(255)",
}

SHELF_COLUMNS = {
    "reference_total_batches": "INTEGER",
}

EXPENSE_CATEGORY_COLUMNS = {
    "reference_sort_order": "INTEGER",
}

SALE_COLUMNS = {
    "doctor_name": "VARCHAR(255)",
    "reference_cost_amount": "NUMERIC(14, 2)",
    "reference_original_total_amount": "NUMERIC(14, 3)",
    "reference_original_discount_amount": "NUMERIC(12, 3)",
    "reference_original_total_payable": "NUMERIC(14, 3)",
    "reference_original_paid": "NUMERIC(12, 3)",
    "reference_original_due": "NUMERIC(12, 3)",
    "reference_original_due_display": "VARCHAR(50)",
    "reference_original_change_returned": "NUMERIC(12, 3)",
    "reference_return_amount": "NUMERIC(12, 2)",
    "reference_return_discount_percent": "NUMERIC(5, 2)",
    "reference_return_discount_percent_visible": "BOOLEAN",
    "reference_return_discount_amount": "NUMERIC(12, 2)",
    "reference_after_return_total_amount": "NUMERIC(12, 2)",
    "reference_after_return_net_paid": "NUMERIC(12, 2)",
    "reference_total_amount_display": "VARCHAR(80)",
    "reference_discount_percent_display": "VARCHAR(80)",
    "reference_discount_amount_display": "VARCHAR(80)",
    "reference_total_payable_display": "VARCHAR(80)",
    "reference_paid_display": "VARCHAR(80)",
    "reference_due_display": "VARCHAR(80)",
    "reference_change_returned_display": "VARCHAR(80)",
}

SALE_ITEM_COLUMNS = {
    "item_type": "VARCHAR(30) NOT NULL DEFAULT 'product'",
    "sale_type": "VARCHAR(30)",
    "reference_qty_returned": "NUMERIC(12, 2)",
    "reference_receipt_name": "VARCHAR(255)",
    "reference_qt_in_box_display": "VARCHAR(50)",
}

RETURN_COLUMNS = {
    "return_invoice_number": "VARCHAR(100)",
}

PHARMACY_PROFILE_COLUMNS = {
    "logo_data_url": "TEXT",
}

BASIC_INDEXES = (
    ("batches", "idx_batches_status_created", "CREATE INDEX IF NOT EXISTS idx_batches_status_created ON batches (status, created_at DESC)"),
    ("batches", "idx_batches_status_expire", "CREATE INDEX IF NOT EXISTS idx_batches_status_expire ON batches (status, expire_date)"),
    ("batches", "idx_batches_supplier_invoice", "CREATE INDEX IF NOT EXISTS idx_batches_supplier_invoice ON batches (supplier_id, supplier_invoice_no)"),
    ("batches", "idx_batches_supplier_id", "CREATE INDEX IF NOT EXISTS idx_batches_supplier_id ON batches (supplier_id)"),
    ("batches", "idx_batches_product_id", "CREATE INDEX IF NOT EXISTS idx_batches_product_id ON batches (product_id)"),
    ("batches", "idx_batches_stock_remaining", "CREATE INDEX IF NOT EXISTS idx_batches_stock_remaining ON batches (stock_remaining)"),
    ("batches", "idx_batches_barcode", "CREATE INDEX IF NOT EXISTS idx_batches_barcode ON batches (barcode)"),
    ("products", "idx_products_name_lower", "CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products (lower(name))"),
    ("suppliers", "idx_suppliers_name_lower", "CREATE INDEX IF NOT EXISTS idx_suppliers_name_lower ON suppliers (lower(name))"),
    ("sales", "idx_sales_date_time", "CREATE INDEX IF NOT EXISTS idx_sales_date_time ON sales (date, time)"),
    ("sales", "idx_sales_status_date", "CREATE INDEX IF NOT EXISTS idx_sales_status_date ON sales (status, date)"),
    ("sale_items", "idx_sale_items_sale_id", "CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id)"),
    ("sale_items", "idx_sale_items_batch_id", "CREATE INDEX IF NOT EXISTS idx_sale_items_batch_id ON sale_items (batch_id)"),
    ("sale_items", "idx_sale_items_product_id", "CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items (product_id)"),
    ("returns", "idx_returns_sale_id", "CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returns (sale_id)"),
    ("returns", "idx_returns_batch_id", "CREATE INDEX IF NOT EXISTS idx_returns_batch_id ON returns (batch_id)"),
)

POSTGRES_SEARCH_INDEXES = (
    ("products", "idx_products_name_trgm", "CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops)"),
    ("batches", "idx_batches_invoice_trgm", "CREATE INDEX IF NOT EXISTS idx_batches_invoice_trgm ON batches USING gin (supplier_invoice_no gin_trgm_ops)"),
    ("batches", "idx_batches_barcode_trgm", "CREATE INDEX IF NOT EXISTS idx_batches_barcode_trgm ON batches USING gin (barcode gin_trgm_ops)"),
    ("suppliers", "idx_suppliers_name_trgm", "CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm ON suppliers USING gin (name gin_trgm_ops)"),
)


def add_missing_columns(engine: Engine, table_name: str, columns: dict[str, str]) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns(table_name)}
    missing = [(name, ddl_type) for name, ddl_type in columns.items() if name not in existing]
    if not missing:
        return

    with engine.begin() as connection:
        for name, ddl_type in missing:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {name} {ddl_type}"))


def alter_numeric_columns(engine: Engine, table_name: str, columns: dict[str, str]) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns(table_name)}
    with engine.begin() as connection:
        for name, ddl_type in columns.items():
            if name in existing:
                connection.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN {name} TYPE {ddl_type}"))


def drop_not_null_constraints(engine: Engine, table_name: str, columns: list[str]) -> None:
    if engine.dialect.name != "postgresql":
        return
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns(table_name)}
    with engine.begin() as connection:
        for name in columns:
            if name in existing:
                connection.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN {name} DROP NOT NULL"))


def create_indexes(engine: Engine) -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as connection:
        for table_name, _index_name, statement in BASIC_INDEXES:
            if table_name in tables:
                connection.execute(text(statement))

    if engine.dialect.name == "postgresql":
        try:
            with engine.begin() as connection:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                for table_name, _index_name, statement in POSTGRES_SEARCH_INDEXES:
                    if table_name in tables:
                        connection.execute(text(statement))
        except SQLAlchemyError:
            # Search remains functional without trigram indexes; avoid blocking app startup
            # on hosts that do not allow extension creation.
            return


def sync_batch_columns(engine: Engine) -> None:
    add_missing_columns(engine, "batches", BATCH_COLUMNS)
    add_missing_columns(engine, "products", PRODUCT_COLUMNS)
    add_missing_columns(engine, "categories", REFERENCE_SORT_COLUMNS)
    add_missing_columns(engine, "medicine_formulas", REFERENCE_SORT_COLUMNS)
    alter_numeric_columns(engine, "medicine_formulas", {
        "description": "TEXT",
    })
    add_missing_columns(engine, "manufacturers", REFERENCE_SORT_COLUMNS)
    add_missing_columns(engine, "suppliers", SUPPLIER_COLUMNS)
    add_missing_columns(engine, "users", USER_COLUMNS)
    add_missing_columns(engine, "shifts", SHIFT_COLUMNS)
    add_missing_columns(engine, "shelves", SHELF_COLUMNS)
    add_missing_columns(engine, "expense_categories", EXPENSE_CATEGORY_COLUMNS)
    add_missing_columns(engine, "sales", SALE_COLUMNS)
    add_missing_columns(engine, "sale_items", SALE_ITEM_COLUMNS)
    drop_not_null_constraints(engine, "sale_items", ["product_id", "batch_id"])
    alter_numeric_columns(engine, "sales", {
        "total_amount": "NUMERIC(14, 3)",
        "discount_amount": "NUMERIC(12, 3)",
        "total_payable": "NUMERIC(14, 3)",
        "paid": "NUMERIC(12, 3)",
        "due": "NUMERIC(12, 3)",
        "change_returned": "NUMERIC(12, 3)",
        "reference_original_total_amount": "NUMERIC(14, 3)",
        "reference_original_discount_amount": "NUMERIC(12, 3)",
        "reference_original_total_payable": "NUMERIC(14, 3)",
        "reference_original_paid": "NUMERIC(12, 3)",
        "reference_original_due": "NUMERIC(12, 3)",
        "reference_original_change_returned": "NUMERIC(12, 3)",
    })
    alter_numeric_columns(engine, "sale_items", {
        "rate": "NUMERIC(12, 3)",
    })
    add_missing_columns(engine, "returns", RETURN_COLUMNS)
    add_missing_columns(engine, "pharmacy_profiles", PHARMACY_PROFILE_COLUMNS)
    if os.getenv("RUN_SCHEMA_INDEX_SYNC") == "1":
        create_indexes(engine)
