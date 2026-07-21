function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Math.round((number(value) + Number.EPSILON) * 100) / 100;
}

function usesReferencePricing(sale) {
  return sale?.reference_original_total_amount != null
    && sale?.reference_original_total_payable != null
    && number(sale.reference_original_total_amount) > 0;
}

export function saleRefundFactor(sale) {
  const items = sale?.items || [];
  let basis;
  let payable;
  if (usesReferencePricing(sale)) {
    basis = number(sale.reference_original_total_amount);
    payable = number(sale.reference_original_total_payable);
  } else {
    basis = items.reduce((sum, item) => sum + number(item.payable_amount ?? item.amount), 0);
    payable = number(sale?.total_payable);
  }
  if (basis <= 0) return 0;
  return Math.min(1, Math.max(0, payable / basis));
}

function refundableItemTotal(sale, item, factor) {
  const base = usesReferencePricing(sale)
    ? number(item.amount) + (number(item.reference_qty_returned) * number(item.rate))
    : number(item.payable_amount ?? item.amount);
  return base * factor;
}

export function refundableProductTotal(sale) {
  const factor = saleRefundFactor(sale);
  const productTotal = (sale?.items || [])
    .filter((item) => item.batch_id != null && item.item_type !== "custom")
    .reduce((sum, item) => sum + refundableItemTotal(sale, item, factor), 0);
  const saleTotal = usesReferencePricing(sale)
    ? number(sale.reference_original_total_payable)
    : number(sale?.total_payable);
  return Math.min(roundMoney(productTotal), roundMoney(saleTotal));
}

export function refundAmountForSegments(segments, quantityAlreadyReturned, quantity) {
  let skip = Math.max(0, number(quantityAlreadyReturned));
  let remaining = Math.max(0, number(quantity));
  let refund = 0;
  segments.forEach((segment) => {
    const segmentQty = number(segment.quantity);
    if (segmentQty <= 0 || remaining <= 0) return;
    if (skip >= segmentQty) {
      skip -= segmentQty;
      return;
    }
    const available = segmentQty - skip;
    skip = 0;
    const used = Math.min(remaining, available);
    refund += used * (number(segment.amount) / segmentQty);
    remaining -= used;
  });
  return roundMoney(refund);
}

export function buildReturnRows(sale, returnQty = {}) {
  const factor = saleRefundFactor(sale);
  const groups = new Map();
  [...(sale?.items || [])]
    .sort((left, right) => number(left.id) - number(right.id))
    .filter((item) => item.batch_id != null && item.item_type !== "custom")
    .forEach((item) => {
      const key = String(item.batch_id);
      const group = groups.get(key) || {
        id: `return-batch-${key}`,
        batch_id: item.batch_id,
        batch_no: item.batch_no,
        product_name: item.product_name,
        quantity_sold: 0,
        reference_returned: 0,
        actual_returned: 0,
        weighted_rate: 0,
        segments: [],
      };
      const itemQty = number(item.total_qty);
      const referenceReturned = number(item.reference_qty_returned);
      group.quantity_sold += itemQty;
      group.reference_returned += referenceReturned;
      group.actual_returned = Math.max(
        group.actual_returned,
        Math.max(0, number(item.qty_returned) - referenceReturned),
      );
      group.weighted_rate += number(item.rate) * itemQty;
      group.segments.push({
        quantity: itemQty,
        amount: refundableItemTotal(sale, item, factor),
      });
      groups.set(key, group);
    });

  const rows = Array.from(groups.values()).map((group) => {
    const quantityReturned = Math.min(
      group.quantity_sold,
      group.reference_returned + group.actual_returned,
    );
    const returnableQty = Math.max(0, group.quantity_sold - quantityReturned);
    const selectedQty = number(returnQty[group.batch_id]);
    return {
      ...group,
      rate: group.quantity_sold ? group.weighted_rate / group.quantity_sold : 0,
      quantity_returned: quantityReturned,
      returnable_qty: returnableQty,
      selected_qty: selectedQty,
      amount: refundAmountForSegments(group.segments, quantityReturned, selectedQty),
    };
  });

  const selectedRows = rows.filter((row) => (
    Number.isInteger(row.selected_qty)
    && row.selected_qty > 0
    && row.selected_qty <= row.returnable_qty
  ));
  const completesSale = selectedRows.length > 0 && rows.reduce(
    (sum, row) => sum + row.quantity_returned + (
      Number.isInteger(row.selected_qty) && row.selected_qty > 0 && row.selected_qty <= row.returnable_qty
        ? row.selected_qty
        : 0
    ),
    0,
  ) >= rows.reduce((sum, row) => sum + row.quantity_sold, 0);
  let remainingRefund = roundMoney(Math.max(
    0,
    refundableProductTotal(sale)
      - number(sale?.reference_return_amount)
      - number(sale?.local_return_amount),
  ));
  selectedRows.forEach((row, index) => {
    const isFinalCompletionRow = completesSale && index === selectedRows.length - 1;
    row.amount = isFinalCompletionRow
      ? remainingRefund
      : Math.min(row.amount, remainingRefund);
    remainingRefund = roundMoney(Math.max(0, remainingRefund - row.amount));
  });
  return rows;
}
