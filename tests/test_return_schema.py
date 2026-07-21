import importlib
import unittest
from datetime import date

from pydantic import ValidationError

ReturnCreate = importlib.import_module("app.schemas.return").ReturnCreate


class ReturnCreateSchemaTests(unittest.TestCase):
    def test_accepts_only_return_intent_fields(self):
        payload = ReturnCreate(
            sale_id=1,
            batch_id=2,
            qty_returned=1,
            date=date(2026, 7, 22),
        )
        self.assertEqual(
            payload.model_dump(),
            {
                "sale_id": 1,
                "batch_id": 2,
                "qty_returned": 1,
                "reason": None,
                "refund_method": None,
                "date": date(2026, 7, 22),
            },
        )

    def test_rejects_non_positive_return_quantity(self):
        with self.assertRaises(ValidationError):
            ReturnCreate(sale_id=1, batch_id=2, qty_returned=0, date=date(2026, 7, 22))

    def test_rejects_fractional_return_quantity(self):
        with self.assertRaises(ValidationError):
            ReturnCreate(sale_id=1, batch_id=2, qty_returned=0.5, date=date(2026, 7, 22))

    def test_rejects_coercive_return_quantities(self):
        for quantity in (True, "1"):
            with self.subTest(quantity=quantity), self.assertRaises(ValidationError):
                ReturnCreate(sale_id=1, batch_id=2, qty_returned=quantity, date=date(2026, 7, 22))

    def test_rejects_refund_method_longer_than_database_column(self):
        with self.assertRaises(ValidationError):
            ReturnCreate(
                sale_id=1,
                batch_id=2,
                qty_returned=1,
                refund_method="x" * 101,
                date=date(2026, 7, 22),
            )


if __name__ == "__main__":
    unittest.main()
