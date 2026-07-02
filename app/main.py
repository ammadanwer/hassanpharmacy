from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.schema_sync import sync_batch_columns
from app.db.session import Base, engine
from app.models import (
    base,
    batch,
    category,
    customer,
    demand,
    expense,
    expense_category,
    manufacturer,
    medicine_formula,
    pharmacy_profile,
    product,
    purchase_order,
    reference_product_sale,
    reference_product_sale_invoice,
    reference_stock_purchase,
    return_,
    return_note,
    return_policy,
    sale,
    sale_item,
    shift,
    shelf,
    stock_audit,
    supplier,
    user,
)

from app.routers import (
    auth,
    batches,
    categories,
    customers,
    demands,
    expense_categories,
    expenses,
    manufacturers,
    medicine_formulas,
    pharmacy_profile as pharmacy_profile_router,
    products,
    purchase_orders,
    reference_stock_purchases,
    return_notes,
    return_policies,
    returns,
    sales,
    shifts,
    shelves,
    staff,
    stock_audits,
    suppliers,
)

app = FastAPI(
    title="Hassan Pharmacy",
    description="Hassan Pharmacy management system",
    version="0.1.0",
)

STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sales.router)
app.include_router(returns.router)
app.include_router(batches.router)
app.include_router(products.router)
app.include_router(purchase_orders.router)
app.include_router(reference_stock_purchases.router)
app.include_router(suppliers.router)
app.include_router(customers.router)
app.include_router(categories.router)
app.include_router(medicine_formulas.router)
app.include_router(manufacturers.router)
app.include_router(pharmacy_profile_router.router)
app.include_router(shelves.router)
app.include_router(expenses.router)
app.include_router(expense_categories.router)
app.include_router(shifts.router)
app.include_router(staff.router)
app.include_router(demands.router)
app.include_router(stock_audits.router)
app.include_router(return_policies.router)
app.include_router(return_notes.router)

Base.metadata.create_all(bind=engine)
sync_batch_columns(engine)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)
