import test from "node:test";
import assert from "node:assert/strict";

import { batchPriceDefaults, latestBatchPriceDefaults, latestPricedBatchForProduct } from "./batchPricing.js";

test("uses the latest effective business date for the same product", () => {
  const rows = [
    { id: 90, product_id: 7, reference_created_at: "2026-01-01", created_at: "2026-07-20T10:00:00Z", sell_price: 10 },
    { id: 12, product_id: 7, batch_purchase_date: "2026-07-21", created_at: "2026-07-01T10:00:00Z", sell_price: 20 },
    { id: 99, product_id: 8, batch_purchase_date: "2026-07-22", sell_price: 99 },
  ];
  assert.equal(latestPricedBatchForProduct(rows, 7)?.id, 12);
});

test("uses created time and id as deterministic tie breakers", () => {
  const rows = [
    { id: 1, product_id: 7, batch_purchase_date: "2026-07-21", created_at: "2026-07-21T09:00:00Z", sell_price: 10 },
    { id: 2, product_id: 7, batch_purchase_date: "2026-07-21", created_at: "2026-07-21T10:00:00Z", sell_price: 20 },
    { id: 3, product_id: 7, batch_purchase_date: "2026-07-21", created_at: "2026-07-21T10:00:00Z", sell_price: 30 },
  ];
  assert.equal(latestPricedBatchForProduct(rows, 7)?.id, 3);
});

test("skips a newer price-less batch and never crosses product ids", () => {
  const rows = [
    { id: 1, product_id: 7, created_at: "2026-07-20T10:00:00Z", entered_sell_price: 25 },
    { id: 2, product_id: 7, created_at: "2026-07-21T10:00:00Z", entered_sell_price: null, sell_price: null },
    { id: 3, product_id: 8, created_at: "2026-07-22T10:00:00Z", entered_sell_price: 99 },
  ];
  assert.equal(latestPricedBatchForProduct(rows, 7)?.id, 1);
  assert.equal(latestPricedBatchForProduct(rows, 9), null);
});

test("copies exact entered prices and their box basis", () => {
  assert.deepEqual(batchPriceDefaults({
    id: 4,
    batch_no: "B-4",
    price_basis: "box",
    entered_cost_price: 120,
    entered_sell_price: 150,
    cost_price: 10,
    sell_price: 12.5,
    units_per_box: 2,
    items_per_unit: 6,
  }), {
    source_batch_id: 4,
    source_batch_no: "B-4",
    price_basis: "box",
    entered_cost_price: 120,
    entered_sell_price: 150,
  });
});

test("treats legacy normalized prices as per-tablet values", () => {
  assert.deepEqual(batchPriceDefaults({ id: 5, cost_price: 10, sell_price: 12.5, units_per_box: 2, items_per_unit: 6 }), {
    source_batch_id: 5,
    source_batch_no: "",
    price_basis: "tablet",
    entered_cost_price: 10,
    entered_sell_price: 12.5,
  });
});

test("preserves zero prices and returns null when no price history exists", () => {
  assert.deepEqual(latestBatchPriceDefaults([
    { id: 6, product_id: 7, entered_cost_price: 0, entered_sell_price: 0, price_basis: "tablet" },
  ], 7), {
    source_batch_id: 6,
    source_batch_no: "",
    price_basis: "tablet",
    entered_cost_price: 0,
    entered_sell_price: 0,
  });
  assert.equal(latestBatchPriceDefaults([{ id: 7, product_id: 7 }], 7), null);
});
