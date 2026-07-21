import unittest

from app.core.permissions import api_permission_requirement


class ReturnPermissionTests(unittest.TestCase):
    def test_product_sale_search_uses_sales_return_permission(self):
        self.assertEqual(
            api_permission_requirement("/api/sales/return-search", "GET"),
            (("sales_return",), "add"),
        )

    def test_legacy_full_return_paths_use_sales_return_permission(self):
        for path in ("/api/sales/42/return", "/api/sales/42/return-all"):
            with self.subTest(path=path):
                self.assertEqual(
                    api_permission_requirement(path, "POST"),
                    (("sales_return",), "add"),
                )


if __name__ == "__main__":
    unittest.main()
