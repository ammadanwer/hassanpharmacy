from __future__ import annotations


def _number(value) -> float:
    return float(value or 0)


def _sale_items(sale) -> list:
    return sorted(
        getattr(sale, "items", []) or [],
        key=lambda item: getattr(item, "id", 0) or 0,
    )


def _money(value) -> float:
    return round(max(0.0, _number(value)) + 1e-9, 2)


def bounded_refund_amount(calculated: float, remaining: float, *, completes_sale: bool) -> float:
    remaining_money = _money(remaining)
    if completes_sale:
        return remaining_money
    return min(_money(calculated), remaining_money)


def refundable_sale_total(sale) -> float:
    reference_total = getattr(sale, "reference_original_total_payable", None)
    if reference_total is not None:
        return max(0.0, _number(reference_total))
    return max(0.0, _number(getattr(sale, "total_payable", 0)))


def refundable_product_total(sale) -> float:
    product_total = sum(
        refundable_item_total(sale, item)
        for item in _sale_items(sale)
        if getattr(item, "batch_id", None) is not None and getattr(item, "item_type", "product") != "custom"
    )
    return min(_money(refundable_sale_total(sale)), _money(product_total))


def _uses_reference_pricing(sale) -> bool:
    return (
        getattr(sale, "reference_original_total_amount", None) is not None
        and getattr(sale, "reference_original_total_payable", None) is not None
        and _number(getattr(sale, "reference_original_total_amount", 0)) > 0
    )


def sale_refund_factor(sale) -> float:
    if _uses_reference_pricing(sale):
        gross = _number(sale.reference_original_total_amount)
        payable = _number(sale.reference_original_total_payable)
    else:
        gross = sum(
            _number(item.payable_amount if item.payable_amount is not None else item.amount)
            for item in _sale_items(sale)
        )
        payable = _number(getattr(sale, "total_payable", 0))
    if gross <= 0:
        return 0.0
    return min(1.0, max(0.0, payable / gross))


def refundable_item_total(sale, item) -> float:
    if _uses_reference_pricing(sale):
        base = _number(item.amount) + (
            _number(getattr(item, "reference_qty_returned", 0)) * _number(getattr(item, "rate", 0))
        )
    else:
        base = _number(item.payable_amount if item.payable_amount is not None else item.amount)
    return base * sale_refund_factor(sale)


def refundable_amount_for_batch(
    sale,
    batch_id: int,
    quantity: float,
    *,
    quantity_already_returned: float = 0,
) -> float:
    remaining = max(0.0, _number(quantity))
    skip = max(0.0, _number(quantity_already_returned))
    refund = 0.0
    for item in _sale_items(sale):
        if item.batch_id != batch_id:
            continue
        item_qty = _number(item.total_qty)
        if item_qty <= 0:
            continue
        if skip >= item_qty:
            skip -= item_qty
            continue
        available_qty = item_qty - skip
        skip = 0.0
        if remaining <= 0:
            break
        qty_for_item = min(remaining, available_qty)
        refund += qty_for_item * (refundable_item_total(sale, item) / item_qty)
        remaining -= qty_for_item
    return _money(refund)
