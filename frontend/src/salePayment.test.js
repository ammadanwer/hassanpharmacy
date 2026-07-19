import test from "node:test";
import assert from "node:assert/strict";

import { defaultAmountReceived, salePaymentRecord } from "./salePayment.js";

test("defaults a decimal payable to the next whole amount", () => {
  assert.equal(defaultAmountReceived(9.5), 10);
});

test("keeps an already-whole payable unchanged", () => {
  assert.equal(defaultAmountReceived(9), 9);
});

test("does not round a floating-point artifact into another whole unit", () => {
  assert.equal(defaultAmountReceived(9.0000000001), 9);
});

test("records an overpayment exactly without treating it as change", () => {
  assert.deepEqual(salePaymentRecord(9.5, 15), {
    paid: 15,
    due: 0,
    changeReturned: 0,
  });
});

test("still records a due amount when the received amount is lower", () => {
  assert.deepEqual(salePaymentRecord(9.5, 5), {
    paid: 5,
    due: 4.5,
    changeReturned: 0,
  });
});
