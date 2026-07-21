from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.product import Product


def adjust_reference_product_stock(
    db: Session,
    product_id: int,
    *,
    total_delta: float = 0,
    remaining_delta: float = 0,
) -> None:
    total_adjustment = int(round(float(total_delta or 0)))
    remaining_adjustment = int(round(float(remaining_delta or 0)))
    updates = {}
    if total_adjustment:
        updates[Product.reference_total_quantity] = func.greatest(
            0,
            func.coalesce(Product.reference_total_quantity, 0) + total_adjustment,
        )
    if remaining_adjustment:
        updates[Product.reference_remaining_quantity] = func.greatest(
            0,
            func.coalesce(Product.reference_remaining_quantity, 0) + remaining_adjustment,
        )
    if not updates:
        return
    (
        db.query(Product)
        .filter(Product.id == product_id, Product.reference_sort_order.isnot(None))
        .update(updates, synchronize_session="fetch")
    )
