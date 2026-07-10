from collections.abc import Iterable

from app.models.user import User


FULL_ACCESS_ROLES = {"owner", "admin"}


def method_action(method: str) -> str:
    if method == "GET":
        return "view"
    if method == "POST":
        return "add"
    if method in {"PUT", "PATCH"}:
        return "edit"
    if method == "DELETE":
        return "delete"
    return "view"


def has_permission(user: User, module_key: str, action: str = "view") -> bool:
    if user.role.value in FULL_ACCESS_ROLES:
        return True
    permissions = user.permissions or {}
    value = permissions.get(module_key)
    if isinstance(value, dict):
        return bool(value.get(action))
    return bool(value)


def has_any_permission(user: User, module_keys: Iterable[str], action: str = "view") -> bool:
    return any(has_permission(user, module_key, action) for module_key in module_keys)


def api_permission_requirement(path: str, method: str, query: dict[str, str] | None = None) -> tuple[tuple[str, ...], str] | None:
    if method == "OPTIONS" or not path.startswith("/api/"):
        return None
    if path.startswith("/api/auth/login") or path.startswith("/api/auth/register") or path.startswith("/api/auth/me"):
        return None
    if path.startswith("/api/auth/change-password"):
        return None
    if path.startswith("/api/pharmacy-profile") and method == "GET":
        return None

    action = method_action(method)
    query = query or {}

    if path.startswith("/api/reports/return-history") or path.startswith("/api/reports/returns-summary"):
        return (("sales_return_history",), "view")
    if path.startswith("/api/reports/product-sales-history") or path.startswith("/api/reports/sales-summary"):
        return (("sales_history",), "view")

    if path.startswith("/api/dashboard-summary"):
        return (("pharmacy_dashboard", "new_sale", "sales_history", "batch", "medical_product", "non_medical_product"), "view")
    if path.startswith("/api/sale-search"):
        return (("new_sale",), "view")
    if path.startswith("/api/returns"):
        return (("sales_return",), "add") if method != "GET" else (("sales_return_history",), "view")
    if path.startswith("/api/draft-sales"):
        if method == "GET":
            return (("new_sale", "sales_history"), "view")
        return (("new_sale",), "add" if method == "POST" else "edit")
    if path.startswith("/api/sales"):
        if method == "GET":
            return (("new_sale", "sales_history"), "view")
        if method == "POST":
            return (("new_sale",), "add")
        return (("new_sale", "sales_history"), action)

    prefix_rules: tuple[tuple[str, tuple[str, ...]], ...] = (
        ("/api/staff", ("pharmacy_component",)),
        ("/api/shifts", ("pharmacy_component",)),
        ("/api/pharmacy-profile", ("pharmacy_component",)),
        ("/api/return-policies", ("pharmacy_component",)),
        ("/api/return-notes", ("pharmacy_component",)),
        ("/api/expenses", ("daily_expense",)),
        ("/api/expense-categories", ("expense_category",)),
        ("/api/demands", ("demand_order",)),
        ("/api/purchase-orders", ("demand_order",)),
        ("/api/stock-audits", ("audit_batch",)),
        ("/api/suppliers", ("supplier",)),
        ("/api/categories", ("category",)),
        ("/api/medicine-formulas", ("medicine_formula",)),
        ("/api/manufacturers", ("manufacturer",)),
        ("/api/batches", ("batch",)),
        ("/api/shelves", ("batch",)),
        ("/api/reference-stock-purchases", ("batch",)),
        ("/api/customers", ("new_sale", "sales_history")),
    )
    for prefix, modules in prefix_rules:
        if path.startswith(prefix):
            required_action = "add" if prefix == "/api/stock-audits" else action
            return (modules, required_action)

    if path.startswith("/api/products"):
        if method == "GET":
            product_type = query.get("type")
            if product_type == "medical":
                return (("medical_product", "new_sale", "sales_return", "demand_order", "audit_batch"), "view")
            if product_type == "non-medical":
                return (("non_medical_product", "new_sale", "sales_return", "demand_order", "audit_batch"), "view")
            return (("medical_product", "non_medical_product", "new_sale", "sales_return", "demand_order", "audit_batch"), "view")
        return (("medical_product", "non_medical_product"), action)

    return None


def can_access_api(user: User, path: str, method: str, query: dict[str, str] | None = None) -> bool:
    requirement = api_permission_requirement(path, method, query)
    if requirement is None:
        return True
    module_keys, action = requirement
    return has_any_permission(user, module_keys, action)
