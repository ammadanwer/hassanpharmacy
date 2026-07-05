from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


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
