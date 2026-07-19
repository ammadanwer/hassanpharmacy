export function defaultAmountReceived(totalPayable) {
  const payable = Number(totalPayable);
  if (!Number.isFinite(payable) || payable <= 0) return 0;
  const payableAtStoredPrecision = Math.round(payable * 1000) / 1000;
  return Math.ceil(payableAtStoredPrecision);
}

export function salePaymentRecord(totalPayable, amountReceived) {
  const payable = Number(totalPayable);
  const paid = Number(amountReceived);
  if (!Number.isFinite(payable) || payable < 0) {
    throw new RangeError("Total payable must be a non-negative number.");
  }
  if (!Number.isFinite(paid) || paid < 0) {
    throw new RangeError("Amount received must be a non-negative number.");
  }
  return {
    paid,
    due: Math.max(0, payable - paid),
    changeReturned: 0,
  };
}

function finiteAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function retainedSaleOverpayment(totalPayable, amountReceived, changeReturned = 0) {
  const payable = finiteAmount(totalPayable);
  const paid = finiteAmount(amountReceived);
  const returned = Math.max(0, finiteAmount(changeReturned));
  return Math.max(0, paid - payable - returned);
}

export function saleProfit(totalPayable, amountReceived, changeReturned, cost) {
  return finiteAmount(totalPayable)
    + retainedSaleOverpayment(totalPayable, amountReceived, changeReturned)
    - finiteAmount(cost);
}
