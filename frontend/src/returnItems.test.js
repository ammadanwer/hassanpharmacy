import assert from "node:assert/strict";
import test from "node:test";

import { buildReturnRows, refundableProductTotal, refundAmountForSegments, saleRefundFactor } from "./returnItems.js";

test("applies checkout discount to the return preview", () => {
  const sale = {
    total_payable: 59.4,
    items: [{ id: 1, batch_id: 4, batch_no: "TEST", product_name: "Test", total_qty: 2, rate: 33, amount: 66, payable_amount: 66, qty_returned: 0 }],
  };
  assert.equal(saleRefundFactor(sale), 0.9);
  assert.equal(buildReturnRows(sale, { 4: 1 })[0].amount, 29.7);
});

test("aggregates duplicate sale lines for one batch", () => {
  const sale = {
    total_payable: 80,
    items: [
      { id: 1, batch_id: 7, batch_no: "DUP", product_name: "Duplicate", total_qty: 2, rate: 10, amount: 20, payable_amount: 20, qty_returned: 1 },
      { id: 2, batch_id: 7, batch_no: "DUP", product_name: "Duplicate", total_qty: 3, rate: 20, amount: 60, payable_amount: 60, qty_returned: 1 },
    ],
  };
  const rows = buildReturnRows(sale, { 7: 2 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].quantity_sold, 5);
  assert.equal(rows[0].quantity_returned, 1);
  assert.equal(rows[0].returnable_qty, 4);
  assert.equal(rows[0].amount, 30);
});

test("combines per-line reference returns without duplicating actual returns", () => {
  const sale = {
    total_payable: 100,
    items: [
      { batch_id: 9, total_qty: 5, amount: 50, payable_amount: 50, rate: 10, reference_qty_returned: 1, qty_returned: 2 },
      { batch_id: 9, total_qty: 5, amount: 50, payable_amount: 50, rate: 10, reference_qty_returned: 2, qty_returned: 3 },
    ],
  };
  const row = buildReturnRows(sale)[0];
  assert.equal(row.quantity_returned, 4);
  assert.equal(row.returnable_qty, 6);
});

test("skips already returned units in FIFO refund allocation", () => {
  const amount = refundAmountForSegments([
    { quantity: 2, amount: 20 },
    { quantity: 3, amount: 60 },
  ], 2, 2);
  assert.equal(amount, 40);
});

test("uses sale item ids for FIFO when relationship order differs", () => {
  const sale = {
    total_payable: 80,
    items: [
      { id: 2, batch_id: 7, total_qty: 3, rate: 20, amount: 60, payable_amount: 60, qty_returned: 2 },
      { id: 1, batch_id: 7, total_qty: 2, rate: 10, amount: 20, payable_amount: 20, qty_returned: 2 },
    ],
  };
  assert.equal(buildReturnRows(sale, { 7: 2 })[0].amount, 40);
});

test("previews the final cent residual from prior server returns", () => {
  const sale = {
    total_payable: 1,
    local_return_amount: 0.66,
    items: [{ id: 1, batch_id: 4, total_qty: 3, rate: 0.333, amount: 1, payable_amount: 1, qty_returned: 2 }],
  };
  assert.equal(buildReturnRows(sale, { 4: 1 })[0].amount, 0.34);
});

test("does not include custom service charges in the product refund cap", () => {
  const sale = {
    total_payable: 100,
    items: [
      { id: 1, batch_id: 4, total_qty: 1, rate: 50, amount: 50, payable_amount: 50, qty_returned: 0 },
      { id: 2, batch_id: null, item_type: "custom", total_qty: 1, rate: 50, amount: 50, payable_amount: 50, qty_returned: 0 },
    ],
  };
  assert.equal(refundableProductTotal(sale), 50);
  assert.equal(buildReturnRows(sale, { 4: 1 })[0].amount, 50);
});
