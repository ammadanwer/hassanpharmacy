import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultAmountReceived,
  retainedSaleOverpayment,
  salePaymentRecord,
  saleProfit,
} from "./salePayment.js";

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

test("adds retained overpayment to sale profit", () => {
  assert.equal(retainedSaleOverpayment(7.2, 10, 0).toFixed(2), "2.80");
  assert.equal(saleProfit(7.2, 10, 0, 6.12).toFixed(2), "3.88");
});

test("does not count cash returned to the customer as profit", () => {
  assert.equal(retainedSaleOverpayment(7.2, 10, 2.8).toFixed(2), "0.00");
  assert.equal(saleProfit(7.2, 10, 2.8, 6.12).toFixed(2), "1.08");
});

test("keeps invoice profit based on payable when payment is partial", () => {
  assert.equal(retainedSaleOverpayment(7.2, 5, 0), 0);
  assert.equal(saleProfit(7.2, 5, 0, 6.12).toFixed(2), "1.08");
});
