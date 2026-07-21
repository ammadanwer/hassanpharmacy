import unittest

from app.routers.sales import literal_contains_pattern


class ReturnSearchTests(unittest.TestCase):
    def test_product_name_search_escapes_sql_wildcards(self):
        self.assertEqual(literal_contains_pattern("10%"), r"%10\%%")
        self.assertEqual(literal_contains_pattern("A_B"), r"%A\_B%")
        self.assertEqual(literal_contains_pattern(r"A\B"), r"%A\\B%")


if __name__ == "__main__":
    unittest.main()
