import unittest
from types import SimpleNamespace

from app.core.return_calculation import (
    bounded_refund_amount,
    refundable_amount_for_batch,
    refundable_product_total,
    refundable_sale_total,
    sale_refund_factor,
)


def item(batch_id, qty, amount, payable=None, reference_qty_returned=0, rate=None, item_id=0, item_type="product"):
    return SimpleNamespace(
        id=item_id,
        item_type=item_type,
        batch_id=batch_id,
        total_qty=qty,
        amount=amount,
        payable_amount=amount if payable is None else payable,
        reference_qty_returned=reference_qty_returned,
        rate=(amount / qty) if rate is None else rate,
    )


def sale(items, total_payable, **overrides):
    return SimpleNamespace(
        items=items,
        total_payable=total_payable,
        reference_original_total_amount=overrides.get("reference_original_total_amount"),
        reference_original_total_payable=overrides.get("reference_original_total_payable"),
    )


class ReturnCalculationTests(unittest.TestCase):
    def test_checkout_discount_is_applied_proportionally(self):
        row = sale([item(1, 2, 66)], 59.40)
        self.assertAlmostEqual(sale_refund_factor(row), 0.9)
        self.assertEqual(refundable_amount_for_batch(row, 1, 1), 29.70)
        self.assertEqual(refundable_amount_for_batch(row, 1, 2), 59.40)

    def test_item_discount_and_checkout_discount_are_not_double_counted(self):
        row = sale([item(1, 2, 100, payable=80), item(None, 1, 20)], 90)
        self.assertAlmostEqual(sale_refund_factor(row), 0.9)
        self.assertEqual(refundable_amount_for_batch(row, 1, 2), 72.00)

    def test_duplicate_batch_lines_use_fifo_after_an_earlier_return(self):
        row = sale([item(7, 2, 20), item(7, 3, 60)], 80)
        self.assertEqual(
            refundable_amount_for_batch(row, 7, 2, quantity_already_returned=2),
            40.00,
        )

    def test_duplicate_batch_fifo_uses_sale_item_id_not_relationship_order(self):
        row = sale([
            item(7, 3, 60, item_id=2),
            item(7, 2, 20, item_id=1),
        ], 80)
        self.assertEqual(
            refundable_amount_for_batch(row, 7, 2, quantity_already_returned=2),
            40.00,
        )

    def test_final_return_absorbs_rounding_residual(self):
        first = bounded_refund_amount(0.33, 1.00, completes_sale=False)
        second = bounded_refund_amount(0.33, 1.00 - first, completes_sale=False)
        final = bounded_refund_amount(0.33, 1.00 - first - second, completes_sale=True)
        self.assertEqual([first, second, final], [0.33, 0.33, 0.34])
        self.assertEqual(round(first + second + final, 2), 1.00)

    def test_custom_service_is_not_included_in_product_refund_cap(self):
        row = sale([
            item(1, 1, 50),
            item(None, 1, 50, item_type="custom"),
        ], 100)
        self.assertEqual(refundable_product_total(row), 50)

    def test_zero_payable_line_refunds_zero(self):
        row = sale([item(3, 1, 25, payable=0)], 0)
        self.assertEqual(refundable_amount_for_batch(row, 3, 1), 0)

    def test_reference_original_totals_drive_imported_sale_refund(self):
        row = sale(
            [item(8, 10, 150, reference_qty_returned=5, rate=30)],
            383,
            reference_original_total_amount=640,
            reference_original_total_payable=500,
        )
        self.assertEqual(refundable_sale_total(row), 500)
        self.assertEqual(
            refundable_amount_for_batch(row, 8, 5, quantity_already_returned=5),
            117.19,
        )


if __name__ == "__main__":
    unittest.main()
