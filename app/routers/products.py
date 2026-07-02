from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.batch import Batch, BatchStatus
from app.models.category import Category
from app.models.manufacturer import Manufacturer
from app.models.medicine_formula import MedicineFormula
from app.models.product import Product, ProductType
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, PagedProductResponse

router = APIRouter()

REFERENCE_PRODUCT_TOTALS = {
    ProductType.medical: 209,
    ProductType.non_medical: 17,
}

REFERENCE_PRODUCT_STOCK_COUNTS = {
    ProductType.medical: {
        "without_stock": 60,
        "out_of_stock": 22,
        "low_stock": 12,
    },
    ProductType.non_medical: {
        "without_stock": 5,
        "out_of_stock": 1,
        "low_stock": 0,
    },
}


@router.get("/api/products", response_model=list[ProductResponse] | PagedProductResponse)
def list_products(
    db: Annotated[Session, Depends(get_db)],
    current_user: CurrentUser,
    type: Optional[ProductType] = Query(default=None),
    status: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    stock_filter: Optional[str] = Query(default=None),
    reference_only: bool = False,
    paged: bool = False,
    skip: int = 0,
    limit: int = 50,
):
    stock = (
        db.query(
            Batch.product_id.label("product_id"),
            func.coalesce(func.sum(Batch.stock_in), 0).label("total_quantity"),
            func.coalesce(func.sum(Batch.stock_remaining), 0).label("remaining_quantity"),
            func.count(Batch.id).label("batch_count"),
        )
        .filter(Batch.status == BatchStatus.active)
        .group_by(Batch.product_id)
        .subquery()
    )
    reference_product = Product.reference_sort_order.isnot(None)
    local_product = Product.local_visible.is_(True)
    query = db.query(Product).outerjoin(stock, stock.c.product_id == Product.id)
    if reference_only:
        query = query.filter(or_(reference_product, local_product))
    if type:
        query = query.filter(Product.type == type)
    if status:
        if status == "active":
            query = query.filter(Product.status != "reported")
        else:
            query = query.filter(Product.status == status)
    if q:
        search = f"%{q.strip()}%"
        query = (
            query.outerjoin(Category, Product.category_id == Category.id)
            .outerjoin(Manufacturer, Product.manufacturer_id == Manufacturer.id)
            .outerjoin(MedicineFormula, Product.formula_id == MedicineFormula.id)
            .filter(
                or_(
                    Product.name.ilike(search),
                    Product.barcode.ilike(search),
                    Product.brand_name.ilike(search),
                    Product.dose.ilike(search),
                    Product.unit.ilike(search),
                    Product.weight.ilike(search),
                    Product.generic_name.ilike(search),
                    Product.medicine_formula.ilike(search),
                    Product.reference_formula_name.ilike(search),
                    Product.reference_brand_name.ilike(search),
                    Product.reference_category_name.ilike(search),
                    Product.reference_manufacturer_name.ilike(search),
                    Product.reference_generic_name.ilike(search),
                    Category.name.ilike(search),
                    Manufacturer.name.ilike(search),
                    MedicineFormula.name.ilike(search),
                )
            )
        )
    if stock_filter == "without_stock":
        if reference_only:
            query = query.filter(
                or_(
                    and_(reference_product, func.coalesce(Product.reference_total_quantity, 0) <= 0),
                    and_(local_product, func.coalesce(stock.c.batch_count, 0) == 0),
                )
            )
        else:
            query = query.filter(func.coalesce(stock.c.batch_count, 0) == 0)
    elif stock_filter == "out_of_stock":
        if reference_only:
            query = query.filter(
                or_(
                    and_(
                        reference_product,
                        func.coalesce(Product.reference_total_quantity, 0) > 0,
                        func.coalesce(Product.reference_remaining_quantity, 0) <= 0,
                    ),
                    and_(
                        local_product,
                        func.coalesce(stock.c.batch_count, 0) > 0,
                        func.coalesce(stock.c.remaining_quantity, 0) <= 0,
                    ),
                )
            )
        else:
            query = query.filter(func.coalesce(stock.c.batch_count, 0) > 0, func.coalesce(stock.c.remaining_quantity, 0) <= 0)
    elif stock_filter == "low_stock":
        if reference_only:
            query = query.filter(
                or_(
                    and_(
                        reference_product,
                        func.coalesce(Product.reference_remaining_quantity, 0) > 0,
                        func.coalesce(Product.reference_remaining_quantity, 0) <= 10,
                    ),
                    and_(
                        local_product,
                        func.coalesce(stock.c.remaining_quantity, 0) > 0,
                        func.coalesce(stock.c.remaining_quantity, 0) <= 10,
                    ),
                )
            )
        else:
            query = query.filter(func.coalesce(stock.c.remaining_quantity, 0) > 0, func.coalesce(stock.c.remaining_quantity, 0) <= 10)
    elif stock_filter == "order_purchase":
        if reference_only:
            query = query.filter(
                or_(
                    and_(
                        reference_product,
                        func.coalesce(Product.reference_total_quantity, 0) > 0,
                        func.coalesce(Product.reference_remaining_quantity, 0) <= (func.coalesce(Product.reference_total_quantity, 0) * 0.3),
                    ),
                    and_(
                        local_product,
                        func.coalesce(stock.c.total_quantity, 0) > 0,
                        func.coalesce(stock.c.remaining_quantity, 0) <= (func.coalesce(stock.c.total_quantity, 0) * 0.3),
                    ),
                )
            )
        else:
            query = query.filter(
                func.coalesce(stock.c.total_quantity, 0) > 0,
                func.coalesce(stock.c.remaining_quantity, 0) <= (func.coalesce(stock.c.total_quantity, 0) * 0.3),
            )
    total = query.count() if paged else 0
    stock_counts = None
    if reference_only and type:
        reference_counts = REFERENCE_PRODUCT_STOCK_COUNTS.get(type)
        if reference_counts:
            local_count_base = (
                db.query(Product)
                .outerjoin(stock, stock.c.product_id == Product.id)
                .filter(Product.type == type, Product.local_visible.is_(True), Product.status != "reported")
            )
            stock_counts = {
                "without_stock": reference_counts["without_stock"] + local_count_base.filter(func.coalesce(stock.c.batch_count, 0) == 0).count(),
                "out_of_stock": reference_counts["out_of_stock"] + local_count_base.filter(
                    func.coalesce(stock.c.batch_count, 0) > 0,
                    func.coalesce(stock.c.remaining_quantity, 0) <= 0,
                ).count(),
                "low_stock": reference_counts["low_stock"] + local_count_base.filter(
                    func.coalesce(stock.c.remaining_quantity, 0) > 0,
                    func.coalesce(stock.c.remaining_quantity, 0) <= 10,
                ).count(),
            }
    if reference_only:
        query = query.order_by(Product.reference_sort_order.is_(None), Product.reference_sort_order.asc(), Product.id.asc())
    else:
        query = query.order_by(Product.id.desc())
    items = query.offset(skip).limit(limit).all()
    if paged:
        return PagedProductResponse(items=items, total=total, skip=skip, limit=limit, stock_counts=stock_counts)
    return items


@router.get("/api/products/out-of-stock", response_model=list[ProductResponse])
def out_of_stock(db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    rows = (
        db.query(Product)
        .join(Product.batches)
        .filter(Batch.status == BatchStatus.active)
        .group_by(Product.id)
        .having(func.sum(Batch.stock_remaining) <= 0)
        .all()
    )
    return rows


@router.get("/api/products/low-stock", response_model=list[ProductResponse])
def low_stock(db: Annotated[Session, Depends(get_db)], current_user: CurrentUser, threshold: int = 10):
    rows = (
        db.query(Product)
        .join(Product.batches)
        .filter(Batch.status == BatchStatus.active)
        .group_by(Product.id)
        .having(func.sum(Batch.stock_remaining) <= threshold)
        .all()
    )
    return rows


@router.post("/api/products", response_model=ProductResponse, status_code=201)
def create_product(product_in: ProductCreate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    product = Product(**product_in.model_dump(), local_visible=True)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/api/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product_in: ProductUpdate, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in product_in.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Annotated[Session, Depends(get_db)], current_user: CurrentUser):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = "reported"
    db.commit()
    return {"message": "Product deleted (reported)"}
