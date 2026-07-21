function hasPriceValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function normalizedPriceBasis(value) {
  const normalized = String(value || "box").trim().toLowerCase();
  return ["tablet", "goli", "patta"].includes(normalized) ? "tablet" : "box";
}

function tabletsPerBox(batch) {
  const explicit = Number(batch?.tablets_per_box || 0);
  if (explicit) return explicit;
  const units = Number(batch?.units_per_box || 1) || 1;
  const items = Number(batch?.items_per_unit || 1) || 1;
  return units * items;
}

function roundedMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function parsedTime(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function effectiveBatchTime(batch) {
  return parsedTime(batch?.batch_purchase_date || batch?.reference_created_at || batch?.created_at);
}

function hasUsableBatchPrice(batch) {
  return ["entered_cost_price", "entered_sell_price", "cost_price", "sell_price"]
    .some((field) => hasPriceValue(batch?.[field]));
}

export function latestPricedBatchForProduct(batches, productId) {
  return [...(batches || [])]
    .filter((batch) => Number(batch.product_id) === Number(productId) && hasUsableBatchPrice(batch))
    .sort((left, right) => (
      effectiveBatchTime(right) - effectiveBatchTime(left)
      || parsedTime(right.created_at) - parsedTime(left.created_at)
      || Number(right.id || 0) - Number(left.id || 0)
    ))[0] || null;
}

export function batchPriceDefaults(batch) {
  if (!batch || !hasUsableBatchPrice(batch)) return null;
  const hasExactEnteredPrice = hasPriceValue(batch.entered_cost_price) || hasPriceValue(batch.entered_sell_price);
  const priceBasis = hasExactEnteredPrice ? normalizedPriceBasis(batch.price_basis) : "tablet";
  const multiplier = priceBasis === "box" ? tabletsPerBox(batch) : 1;
  const enteredPrice = (enteredField, normalizedField) => {
    if (hasPriceValue(batch[enteredField])) return batch[enteredField];
    if (!hasPriceValue(batch[normalizedField])) return "";
    return roundedMoney(Number(batch[normalizedField]) * multiplier);
  };
  return {
    source_batch_id: batch.id,
    source_batch_no: batch.reference_batch_no || batch.batch_no || "",
    price_basis: priceBasis,
    entered_cost_price: enteredPrice("entered_cost_price", "cost_price"),
    entered_sell_price: enteredPrice("entered_sell_price", "sell_price"),
  };
}

export function latestBatchPriceDefaults(batches, productId) {
  return batchPriceDefaults(latestPricedBatchForProduct(batches, productId));
}
