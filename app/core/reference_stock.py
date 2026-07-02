from sqlalchemy.orm import Session

from app.models.product import Product


def adjust_reference_product_stock(
    db: Session,
    product_id: int,
    *,
    total_delta: float = 0,
    remaining_delta: float = 0,
) -> None:
    product = db.get(Product, product_id)
    if not product or product.reference_sort_order is None:
        return
    if total_delta:
        product.reference_total_quantity = max(0, int(round((product.reference_total_quantity or 0) + total_delta)))
    if remaining_delta:
        product.reference_remaining_quantity = max(0, int(round((product.reference_remaining_quantity or 0) + remaining_delta)))
    db.add(product)
