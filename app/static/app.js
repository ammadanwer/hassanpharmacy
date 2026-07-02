const state = {
  token: localStorage.getItem("pmsToken") || "",
  user: JSON.parse(localStorage.getItem("pmsUser") || "null"),
  route: location.hash.replace("#", "") || "dashboard",
  openGroups: new Set(["sales", "inventory", "daily-expense", "settings"]),
  sidebarCollapsed: localStorage.getItem("pmsSidebarCollapsed") === "1",
  saleView: localStorage.getItem("pmsSaleView") || "new",
  data: {},
  saleItems: [],
  saleDrafts: JSON.parse(localStorage.getItem("pmsSaleDrafts") || "[]"),
  returnSale: null,
  draftRows: { demand: [], audit: [] },
};

const menu = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  {
    id: "sales", label: "Sales", icon: "sales", children: [
      ["newsale", "New Sale"],
      ["return-item", "Return Item"],
      ["saleshistory", "Sales History"],
      ["returnhistory", "Return History"],
      ["productsaleshistory", "Product Sales History"],
      ["customer-history", "Customer History"],
    ],
  },
  {
    id: "inventory", label: "Inventory", icon: "inventory", children: [
      ["batch", "Batch"],
      ["demand", "Demand/Order"],
      ["stock-audit", "Stock Audit"],
      ["order-purchase", "Order Purchase"],
      ["medicines", "Medical Products"],
      ["nonmedicines", "Non Medical Products"],
      ["supplier", "Supplier"],
      ["category", "Category"],
      ["medicineformula", "Medicine Formula"],
      ["manufacturer", "Manufacturer"],
      ["purchases", "Stock Purchase"],
      ["shelf", "Shelf"],
    ],
  },
  { id: "staff-management", label: "Staff Management", icon: "staff" },
  { id: "shift-management", label: "Shift Management", icon: "shift" },
  {
    id: "daily-expense", label: "Daily Expense", icon: "expense", children: [
      ["daily-expense", "Expense"],
      ["expense-category", "Expense Category"],
    ],
  },
  {
    id: "settings", label: "Settings", icon: "settings", children: [
      ["settings/change-password", "Change Password"],
      ["return-policy", "Return Policy/Notes"],
    ],
  },
];

const resources = {
  supplier: {
    title: "Supplier",
    endpoint: "/api/suppliers",
    action: "Add New Supplier",
    fields: [["name", "Supplier Name/Company", "text", true, null, "Supplier name"], ["contact_person", "Contact Person", "text", false, null, "contact person name"], ["phone", "Phone#", "text", false, null, "03xx xxxxxxx"], ["email", "Email", "email", false, null, "Enter email"]],
    columns: [["name", "Supplier Name/Company"], ["contact_person", "Contact Person"], ["phone", "Phone#"], ["email", "Email"], ["totalBatches", "Total Batches"], ["stockPurchase", "Stock Purchase Price"], ["paid", "Paid Amount"], ["outstanding", "Supplier Outstanding"], ["status", "Status"]],
    map: (row) => ({ ...row, totalBatches: batchRows().filter((b) => b.supplier_id === row.id).length || "-", stockPurchase: money(sum(batchRows().filter((b) => b.supplier_id === row.id), "total_cost")), paid: money(sum(batchRows().filter((b) => b.supplier_id === row.id), "paid_amount")), outstanding: money(sum(batchRows().filter((b) => b.supplier_id === row.id), "supplier_outstanding")), status: sum(batchRows().filter((b) => b.supplier_id === row.id), "supplier_outstanding") > 0 ? "Partially Paid" : "Paid" }),
  },
  category: {
    title: "Category",
    endpoint: "/api/categories",
    action: "Add New Category",
    fields: [["type", "Type", "select", true, ["medical", "non-medical"]], ["name", "Category Name", "text", true]],
    columns: [["name", "Category Name"], ["type", "Type"]],
  },
  medicineformula: {
    title: "Medicine Formula",
    endpoint: "/api/medicine-formulas",
    action: "Add New Formula Name",
    fields: [["name", "Medicine Formula Name", "text", true], ["description", "Description", "text"]],
    columns: [["name", "Medicine Formula Name"], ["description", "Description"]],
  },
  manufacturer: {
    title: "Manufacturer",
    endpoint: "/api/manufacturers",
    action: "Add New Manufacturer",
    fields: [["name", "Manufacturer Name", "text", true]],
    columns: [["name", "Manufacturer Name"]],
  },
  shelf: {
    title: "Shelf",
    endpoint: "/api/shelves",
    action: "Add New Shelf",
    modalTitle: "Add Shelf",
    submitLabel: "Add",
    fields: [["name", "Shelf Name", "text", true, null, "Shelf A"]],
    columns: [["name", "Name"], ["totalBatches", "Total Batches"]],
    map: (row) => ({ ...row, totalBatches: batchRows().filter((b) => b.shelf_id === row.id).length }),
  },
  "expense-category": {
    title: "Expense Category",
    endpoint: "/api/expense-categories",
    action: "Add New Category",
    submitLabel: "Add",
    fields: [["name", "Category Name", "text", true, null, "Office Supplies"], ["description", "Description", "text", false, null, "Enter Description..."]],
    columns: [["name", "Category Name"], ["description", "Description"]],
  },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
const productRows = () => state.data.products || [];
const batchRows = () => state.data.batches || [];
const supplierRows = () => state.data.suppliers || [];
const shelfRows = () => state.data.shelves || [];
const saleRows = () => state.data.sales || [];
const returnRows = () => state.data.returns || [];
const staffRows = () => state.data.staff || [];

function navIcon(name) {
  const icons = {
    dashboard: "M3 11h8V3H3v8Zm10 10h8v-8h-8v8ZM3 21h8v-8H3v8Zm10-10h8V3h-8v8Z",
    sales: "M4 5h16v4H4V5Zm0 6h16v8H4v-8Zm3 2v4h2v-4H7Zm4 0v4h6v-4h-6Z",
    inventory: "M4 6 12 2l8 4v12l-8 4-8-4V6Zm8 2 4.8-2L12 4 7.2 6 12 8Zm-6 1.3v7.4l5 2.5v-7.4l-5-2.5Zm7 9.9 5-2.5V9.3l-5 2.5v7.4Z",
    staff: "M8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm8.5 1a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7ZM2 20c.4-4 2.7-6 6-6s5.6 2 6 6H2Zm11.5-5.6c.9-.9 2-1.4 3.5-1.4 2.8 0 4.6 1.7 5 5h-6.4a7.3 7.3 0 0 0-2.1-3.6Z",
    shift: "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm1-10.4V6h-2v6.4l4.7 3 1.1-1.7-3.8-2.1Z",
    expense: "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm1-16h-2v2.1c-1.8.3-3 1.5-3 3.1 0 1.9 1.5 2.7 3.7 3.2 1.5.4 2.1.7 2.1 1.5 0 .7-.7 1.2-1.8 1.2-1.2 0-2.2-.4-3.1-1.1L8 17.7c.8.7 1.8 1.1 3 1.3V21h2v-2c1.8-.3 3-1.5 3-3.2 0-1.8-1.2-2.7-3.7-3.3-1.6-.4-2.3-.7-2.3-1.4 0-.7.7-1.1 1.7-1.1 1 0 1.8.3 2.6.8l.9-1.7c-.7-.5-1.4-.8-2.2-1V6Z",
    settings: "M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A7.6 7.6 0 0 0 7 6L4.6 5l-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z",
    help: "M11 18h2v-2h-2v2Zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm0-14a3.5 3.5 0 0 0-3.5 3.5h2A1.5 1.5 0 1 1 12 11c-1.6 0-2.5 1.1-2.5 2.5V15h2v-1.5c0-.4.2-.5.5-.5a3.5 3.5 0 0 0 0-7Z",
  };
  return `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.help}"></path></svg>`;
}

function setNotice(message, isError = true) {
  const notice = $("#notice");
  notice.hidden = !message;
  notice.textContent = message || "";
  notice.className = `notice ${isError ? "error" : "success"}`;
}

function clearSession() {
  state.token = "";
  state.user = null;
  state.data = {};
  localStorage.removeItem("pmsToken");
  localStorage.removeItem("pmsUser");
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const detail = body && body.detail ? body.detail : body || response.statusText;
    const message = Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : detail;
    const error = new Error(response.status === 401 ? "Session expired. Please sign in again." : message);
    if (response.status === 401) {
      error.authExpired = true;
      clearSession();
    }
    throw error;
  }
  return body;
}

async function loadCoreData() {
  if (!state.token) return;
  const calls = {
    products: "/api/products?limit=500",
    batches: "/api/batches?limit=500",
    suppliers: "/api/suppliers?limit=500",
    categories: "/api/categories?limit=500",
    formulas: "/api/medicine-formulas?limit=500",
    manufacturers: "/api/manufacturers?limit=500",
    shelves: "/api/shelves?limit=500",
    sales: "/api/sales?limit=500",
    returns: "/api/returns?limit=500",
    customers: "/api/customers?limit=500",
    demands: "/api/demands?limit=500",
    stockAudits: "/api/stock-audits?limit=500",
    expenses: "/api/expenses?limit=500",
    expenseCategories: "/api/expense-categories?limit=500",
    shifts: "/api/shifts?limit=500",
    staff: "/api/staff?limit=500",
    returnPolicies: "/api/return-policies?limit=500",
    returnNotes: "/api/return-notes?limit=500",
  };
  const entries = await Promise.all(Object.entries(calls).map(async ([key, path]) => {
    try {
      return [key, await api(path)];
    } catch (error) {
      if (error.authExpired) throw error;
      return [key, []];
    }
  }));
  state.data = Object.fromEntries(entries);
}

function updateShell() {
  const active = activeLabel();
  $(".app-shell").classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  $("#viewTitle").textContent = active;
  $("#viewSubtitle").textContent = state.route === "dashboard" ? "Hassan Pharmacy" : "";
  $("#authPanel").hidden = Boolean(state.token);
  $("#logoutBtn").hidden = !state.token;
  $("#sessionName").textContent = state.user ? `${state.user.name} (${state.user.role})` : "Not signed in";
}

function activeLabel() {
  for (const item of menu) {
    if (item.id === state.route) return item.label;
    const child = item.children?.find(([id]) => id === state.route);
    if (child) return child[1];
  }
  return "Dashboard";
}

function renderNav() {
  $("#nav").innerHTML = menu.map((item) => {
    const hasChildren = item.children?.length;
    const active = item.id === state.route || item.children?.some(([id]) => id === state.route);
    const children = hasChildren && state.openGroups.has(item.id)
      ? `<div class="subnav">${item.children.map(([id, label]) => `<button class="subnav-btn ${id === state.route ? "active" : ""}" data-route="${id}" type="button">${label}</button>`).join("")}</div>`
      : "";
    return `<div class="nav-group">
      <button class="nav-btn ${active ? "active" : ""}" title="${item.label}" data-route="${hasChildren ? "" : item.id}" data-group="${hasChildren ? item.id : ""}" type="button"><span>${navIcon(item.icon)}</span><b>${item.label}</b>${hasChildren ? "<em>⌄</em>" : ""}</button>
      ${children}
    </div>`;
  }).join("") + `<div class="help-link"><button class="nav-btn" title="Get Technical Help" type="button"><span>${navIcon("help")}</span><b>Get Technical Help</b></button></div>`;
  $$("[data-group]").forEach((button) => button.addEventListener("click", () => {
    const group = button.dataset.group;
    if (!group) return;
    state.openGroups.has(group) ? state.openGroups.delete(group) : state.openGroups.add(group);
    renderNav();
  }));
  $$("[data-route]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.route) routeTo(button.dataset.route);
  }));
}

function routeTo(route) {
  state.route = route;
  location.hash = route;
  render();
}

async function render(route = state.route) {
  state.route = route || "dashboard";
  setNotice("");
  renderNav();
  updateShell();
  if (!state.token) {
    $("#content").innerHTML = "";
    return;
  }
  try {
    await loadCoreData();
  } catch (error) {
    $("#content").innerHTML = "";
    updateShell();
    setNotice(error.message);
    return;
  }
  const content = $("#content");
  if (state.route === "dashboard") content.innerHTML = dashboardPage();
  else if (state.route === "newsale") renderNewSale(content);
  else if (state.route === "return-item") content.innerHTML = returnItemPage();
  else if (state.route === "saleshistory") content.innerHTML = salesHistoryPage();
  else if (state.route === "returnhistory") content.innerHTML = returnHistoryPage();
  else if (state.route === "productsaleshistory") content.innerHTML = productSalesHistoryPage();
  else if (state.route === "customer-history") content.innerHTML = customerHistoryPage();
  else if (state.route === "batch") content.innerHTML = batchPage();
  else if (state.route === "demand") content.innerHTML = demandPage();
  else if (state.route === "stock-audit") content.innerHTML = stockAuditPage();
  else if (state.route === "order-purchase") content.innerHTML = orderPurchasePage();
  else if (state.route === "medicines") content.innerHTML = productPage("medical");
  else if (state.route === "nonmedicines") content.innerHTML = productPage("non-medical");
  else if (resources[state.route]) renderResourcePage(content, state.route);
  else if (state.route === "purchases") content.innerHTML = purchasesPage();
  else if (state.route === "staff-management") content.innerHTML = staffPage();
  else if (state.route === "shift-management") renderResourcePage(content, "shifts");
  else if (state.route === "daily-expense") content.innerHTML = expensePage();
  else if (state.route === "settings/change-password") content.innerHTML = changePasswordPage();
  else if (state.route === "return-policy") content.innerHTML = returnPolicyPage();
  bindPageActions();
}

function productName(id) {
  return productRows().find((row) => row.id === Number(id))?.name || "-";
}

function supplierName(id) {
  return supplierRows().find((row) => row.id === Number(id))?.name || "-";
}

function userName(id) {
  return staffRows().find((row) => row.id === Number(id))?.name || state.user?.name || "-";
}

function dashboardPage() {
  const products = productRows();
  const batches = batchRows();
  const sales = state.data.sales || [];
  const todaySales = sales.filter((sale) => sale.date === today());
  const netToday = sum(todaySales, "total_payable");
  const monthlyRevenue = sum(sales, "total_payable");
  const totalCost = sum(batches, "total_cost");
  const shortage = products.filter((p) => stockForProduct(p.id) <= 10).length;
  const expired = batches.filter((b) => b.expire_date && new Date(b.expire_date) < new Date()).slice(0, 12);
  const expiredCount = batches.filter((b) => b.expire_date && new Date(b.expire_date) < new Date()).length;
  const outOfStock = batches.filter((b) => Number(b.stock_remaining || 0) <= 0).length;
  const frequent = topSoldProducts(sales).slice(0, 3).join(", ") || "-";
  return `
    <section class="kpi-strip">
      ${kpiCard("▣", `Rs. ${money(netToday)}`, "Today's Net Sale", "mint")}
      ${kpiCard("▭", `Rs. ${money(monthlyRevenue)}`, "Monthly Revenue", "cream", "Pending: 0", "VIEW DETAILS")}
      ${kpiCard("⊞", products.length.toLocaleString(), "All Products", "lavender", `Medical: ${products.filter((p) => p.type === "medical").length}<br>Non-Medical: ${products.filter((p) => p.type !== "medical").length}`)}
      ${kpiCard("✚", money(totalCost), "Total Cost", "peach")}
      <article class="shortage-card"><div class="warn-icon">⚠</div><strong>${shortage}</strong><span>Medicine Shortage</span><button data-route="medicines">Resolve Now »</button></article>
    </section>
    <section class="dashboard-grid">
      <article class="paper">
        <div class="paper-head"><h2>List of Expired Medicine Batch</h2><button class="text-btn" data-route="batch">View Expired<br>Batches</button><span>»</span></div>
        <div class="expired-list">${expired.length ? expired.map((b) => `<div><span>${b.batch_no}</span><span>${productName(b.product_id)}</span><span>${dateFmt(b.expire_date)}</span></div>`).join("") : `<p class="empty">No expired batches found.</p>`}</div>
      </article>
      <article class="paper">
        <div class="paper-head"><h2>Quick Monthly Report</h2><select><option>June 2026</option><option>May 2026</option><option>April 2026</option></select></div>
        <div class="monthly-report"><div><strong>${sumSalesQty(sales)}</strong><span>Qty of Products Sold</span></div><div><strong>${sales.length}</strong><span>Invoices Generated</span></div></div>
      </article>
    </section>
    <section class="paper overview-panel">
      <div class="paper-head"><h2>Medicine Batches Overview</h2><button class="text-btn" data-route="batch">Go To Batch Management »</button></div>
      <div class="overview-grid">
        <div><strong>${batches.length}</strong><span>Batches in Stock</span></div>
        <div><strong>${outOfStock}</strong><span>Batches out of Stock</span></div>
        <div><strong>${expiredCount}</strong><span>Expired Batches</span></div>
        <div><strong>${frequent}</strong><span>Frequently bought Item(s)</span></div>
      </div>
    </section>`;
}

function kpiCard(icon, value, label, tone, sub = "", action = "") {
  return `<article class="kpi-card ${tone}"><div class="kpi-icon">${icon}</div><strong>${value}</strong><span>${label}</span>${sub ? `<small>${sub}</small>` : ""}${action ? `<button class="text-btn">${action}</button>` : ""}</article>`;
}

function stockForProduct(productId) {
  return sum(batchRows().filter((batch) => batch.product_id === productId), "stock_remaining");
}

function sumSalesQty(sales) {
  return sales.reduce((total, sale) => total + (sale.items || []).reduce((s, item) => s + Number(item.total_qty || 0), 0), 0);
}

function topSoldProducts(sales) {
  const counts = new Map();
  sales.forEach((sale) => (sale.items || []).forEach((item) => {
    const name = item.product_name || productName(item.product_id);
    counts.set(name, (counts.get(name) || 0) + Number(item.total_qty || 0));
  }));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

function dateFmt(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function renderNewSale(content) {
  if (state.saleView !== "new") {
    content.innerHTML = `
      ${saleTabsMarkup()}
      ${state.saleView === "recent" ? recentSalesPanel() : draftSalesPanel()}`;
    return;
  }
  if (!state.saleItems.length && batchRows().length) {
    const batch = batchRows()[0];
    state.saleItems.push({ batch_id: batch.id, product_id: batch.product_id, qt_in_box: 0, qt_in_units: 1, total_qty: 1, cost_price: Number(batch.cost_price || 0), rate: Number(batch.sell_price || 0), amount: Number(batch.sell_price || 0), discount_percent: 0, discount_amount: 0 });
  }
  content.innerHTML = `
    ${saleTabsMarkup()}
    <section class="sale-customer-strip"><label>Customer Name<input id="saleCustomerName" placeholder="Walk-in"></label><label>Phone #<input id="saleCustomerPhone" placeholder="03xxxxxxxxx"></label><label>Paid Amount<input id="salePaid" type="number" min="0" step="0.01" value="${salePayable()}"></label></section>
    <section class="sale-entry-panel">
      <table class="entry-table"><thead><tr><th>Product Name</th><th>Bar Code</th><th>Sale Type</th><th>Quantity</th><th>Action</th></tr></thead>
      <tbody><tr><td>${saleProductInput()}</td><td><input id="saleBarcode" placeholder="Enter Barcode"></td><td><select id="saleType"><option>Unit</option><option>Box</option></select></td><td><input id="saleQty" type="number" placeholder="Enter quantity" value="1"></td><td><button id="addSaleItem" type="button">Add to List</button></td></tr></tbody></table>
    </section>
    <section class="sale-list-panel">
      <div class="sale-list-title">Purchased Items List</div>
      ${saleItemsTable()}
      <div class="sale-total"><span>Payable Amt.</span><strong>Rs. ${money(salePayable())}</strong></div>
      <div class="sale-footer"><button id="saveDraft" class="outline danger-outline" type="button">Save as a Draft</button><button id="checkoutSale" type="button">Proceed to Checkout</button></div>
    </section>`;
}

function saleTabsMarkup() {
  return `<section class="sales-tabs">
    ${["new", "recent", "draft"].map((mode) => `<label class="${state.saleView === mode ? "active" : ""}"><input name="saleView" data-sale-view="${mode}" type="radio" ${state.saleView === mode ? "checked" : ""}> ${mode === "new" ? "New Sales" : mode === "recent" ? "Recent Sales" : "Draft Sales"}</label>`).join("")}
  </section>`;
}

function recentSalesPanel() {
  const rows = saleRows().slice(0, 20).map((s) => [s.invoice_number, s.customer_name || "Walk-in", dateFmt(s.date), money(s.total_payable), money(s.paid), money(s.due), s.status, `<button data-route="saleshistory" type="button">View</button>`]);
  return `<section class="paper"><div class="paper-head"><h2>Recent Sales</h2><button data-sale-view-button="new" type="button">New Sale</button></div>${dataTable(["Invoice ID", "Customer", "Date", "Net Sales", "Paid", "Pending", "Status", "Action"], rows)}</section>`;
}

function draftSalesPanel() {
  const rows = state.saleDrafts.map((draft, index) => [draft.id, dateFmt(draft.date), draft.customer_name || "Walk-in", draft.items.length, money(draft.total_payable), `<button data-load-draft="${index}" type="button">Resume</button> <button class="icon-btn" data-delete-draft="${index}" type="button">×</button>`]);
  return `<section class="paper"><div class="paper-head"><h2>Draft Sales</h2><button data-sale-view-button="new" type="button">New Sale</button></div>${dataTable(["Draft ID", "Date", "Customer", "Items", "Payable Amt", "Actions"], rows)}</section>`;
}

function persistSaleDrafts() {
  localStorage.setItem("pmsSaleDrafts", JSON.stringify(state.saleDrafts));
}

function setSaleView(mode) {
  state.saleView = mode;
  localStorage.setItem("pmsSaleView", mode);
  render("newsale");
}

function batchSelect(id) {
  return `<select id="${id}">${batchRows().map((b) => `<option value="${b.id}">${productName(b.product_id)} / ${b.batch_no}</option>`).join("")}</select>`;
}

function saleProductInput() {
  return `<div class="sale-product-combobox">
    <input id="saleProductInput" autocomplete="off" placeholder="Enter Product Name">
    <input id="saleBatch" type="hidden">
    <div id="saleProductSuggestions" class="sale-suggestions" hidden></div>
  </div>`;
}

function saleSuggestionRows(query = "") {
  const normalized = query.trim().toLowerCase();
  return batchRows()
    .filter((batch) => Number(batch.stock_remaining || 0) > 0)
    .filter((batch) => {
      if (!normalized) return true;
      const product = productName(batch.product_id).toLowerCase();
      return product.includes(normalized) || String(batch.batch_no || "").toLowerCase().includes(normalized) || String(batch.barcode || "").toLowerCase().includes(normalized);
    })
    .slice(0, 8);
}

function renderSaleSuggestions(query = "") {
  const panel = $("#saleProductSuggestions");
  if (!panel) return;
  const rows = saleSuggestionRows(query);
  panel.innerHTML = rows.length
    ? rows.map((batch) => `<button type="button" data-sale-batch-option="${batch.id}"><strong>${productName(batch.product_id)}</strong><span>Batch ${batch.batch_no || "-"} · Stock ${batch.stock_remaining || 0}</span></button>`).join("")
    : `<div class="sale-suggestion-empty">No products found</div>`;
  panel.hidden = false;
}

function saleItemsTable() {
  const heads = ["Product Name", "Batch no.", "Qt in Box", "Qt in Units", "Total Quantity", "Cost Price", "Rate/Sell Price", "Amount", "Discount(%)", "Discount(Amt)", "Payable Amt", "Actions"];
  return dataTable(heads, state.saleItems.map((item, index) => {
    const batch = batchRows().find((b) => b.id === Number(item.batch_id)) || {};
    return [productName(item.product_id), batch.batch_no || "-", item.qt_in_box, item.qt_in_units, item.total_qty, money(item.cost_price), `${money(item.rate)}<br><label class="mini-check"><input type="checkbox"> Update Globally</label>`, money(item.amount), item.discount_percent || "", item.discount_amount || "", money(item.amount - Number(item.discount_amount || 0)), `<button class="icon-btn" data-remove-sale="${index}" type="button">×</button>`];
  }));
}

function salePayable() {
  return state.saleItems.reduce((total, item) => total + Number(item.amount || 0) - Number(item.discount_amount || 0), 0);
}

function returnItemPage() {
  const sale = state.returnSale;
  const rows = sale ? (sale.items || []).map((item) => {
    const returned = returnRows().filter((r) => r.sale_id === sale.id && r.batch_id === item.batch_id).reduce((total, r) => total + Number(r.qty_returned || 0), 0);
    const remaining = Math.max(0, Number(item.total_qty || 0) - returned);
    return [item.batch_no, item.product_name, item.total_qty, `<input class="return-qty" data-sale-item="${item.id}" data-batch="${item.batch_id}" data-sold="${item.total_qty}" data-rate="${item.rate}" type="number" min="0" max="${remaining}" value="${remaining}">`, money(item.rate), money(remaining * Number(item.rate || 0)), `<button data-return-item="${item.id}" type="button">Return</button>`];
  }) : [];
  return `<section class="paper form-strip"><label>Reference Invoice #<input id="returnInvoice" placeholder="Enter the original invoice#" value="${sale?.invoice_number || ""}"></label><label>Return Invoice Date<input id="returnDate" value="${dateFmt(today())}"></label><button id="loadReturnInvoice" type="button">Load Invoice</button></section>
  <section class="paper"><h2>Purchased Items List</h2>${dataTable(["Batch no.", "Name", "Quantity Sold", "Quantity Returned", "Rate/Sell Price", "Amount", "Action"], rows)}<div class="right-actions"><button id="returnAllInvoice" type="button" ${sale ? "" : "disabled"}>Generate Invoice</button></div></section>`;
}

function salesHistoryPage() {
  const rows = saleRows().map((s) => [s.invoice_number, s.customer_name || "-", dateFmt(s.date), money(s.total_payable), money(s.paid), money(s.due), s.status]);
  return historyShell("Print Sales History", ["Gross Sales", "Total Discount", "Net Sales", "Total Cost", "Net Revenue", "Pending"], rows, ["Invoice ID", "Customer", "Date", "Net Sales", "Paid", "Pending", "Status"], "Search by Invoice ID/Medicine Name...");
}

function returnHistoryPage() {
  const rows = returnRows().map((r) => {
    const sale = saleRows().find((s) => s.id === r.sale_id);
    return [sale?.invoice_number || r.sale_id, dateFmt(r.date), money(r.amount), sale?.status || "-"];
  });
  return historyShell("", ["Gross Sales", "Total Return", "Net Sale"], rows, ["Invoice ID", "Date", "Return Amount", "Status"], "Search by Invoice ID...");
}

function productSalesHistoryPage() {
  const rows = saleRows().flatMap((sale) => (sale.items || []).map((item) => [item.product_name, item.batch_no, item.total_qty, money(item.payable_amount || item.amount), dateFmt(sale.date), sale.invoice_number]));
  return historyShell("", [], rows, ["Product", "Batch", "Qty", "Amount", "Date", "Invoice ID"], "Search...");
}

function historyShell(printLabel, metrics, rows, heads, placeholder) {
  return `<section class="paper filters"><label><input type="radio" checked> Date</label><label><input type="radio"> Date Range</label><input type="date" value="${today()}"><input placeholder="hh:mm (a|p)m" value="12:00 AM"><input placeholder="hh:mm (a|p)m" value="11:59 PM">${printLabel ? `<button class="outline">${printLabel}</button>` : ""}<select><option>All</option><option>Paid</option><option>Pending</option></select><input placeholder="${placeholder}"></section>
  ${metrics.length ? `<section class="metric-row">${metrics.map((m, i) => `<div><strong>Rs. ${i === 1 ? money(sum(returnRows(), "amount")) : i ? "0.00" : money(sum(saleRows(), "total_payable"))}</strong><span>${m}</span></div>`).join("")}</section>` : ""}
  <section class="paper">${dataTable(heads, rows)}</section>`;
}

function customerHistoryPage() {
  const customers = new Map();
  (state.data.customers || []).forEach((c) => customers.set(c.phone || c.name, { name: c.name, phone: c.phone || "-", due: Number(c.due_amount || 0), sales: 0 }));
  saleRows().forEach((s) => {
    const key = s.customer_phone || s.customer_name || "Walk-in";
    if (!customers.has(key)) customers.set(key, { name: s.customer_name || "Walk-in", phone: s.customer_phone || "-", due: 0, sales: 0 });
    customers.get(key).due += Number(s.due || 0);
    customers.get(key).sales += 1;
  });
  return tablePage("Customer History", "", ["Name", "Phone#", "Invoices", "Due Amount", "Actions"], [...customers.values()].map((c) => [c.name, c.phone, c.sales, money(c.due), ""]));
}

function batchPage() {
  const rows = batchRows().map((b) => [b.batch_no || "-", b.shelf_id || "-", productName(b.product_id), productRows().find((p) => p.id === b.product_id)?.medicine_formula || "-", money(b.stock_in), money(b.stock_out), money(b.stock_remaining), money(b.purchase_price), money(b.purchase_price_before_tax), `${money(b.sell_price)}/unit`, `${money(b.cost_price)}/unit`, money(b.total_cost), dateFmt(b.production_date), dateFmt(b.expire_date), dateFmt(b.created_at), supplierName(b.supplier_id), money(b.paid_amount), money(b.supplier_outstanding), b.supplier_invoice_no || "-", ""]);
  const expiredCount = batchRows().filter((b) => b.expire_date && new Date(b.expire_date) < new Date()).length;
  const nearExpiry = batchRows().filter((b) => b.expire_date).length;
  const totals = ["Total", "-", "-", "-", money(sum(batchRows(), "stock_in")), money(sum(batchRows(), "stock_out")), money(sum(batchRows(), "stock_remaining")), money(sum(batchRows(), "purchase_price")), money(sum(batchRows(), "purchase_price_before_tax")), "-", "-", money(sum(batchRows(), "total_cost")), "-", "-", "-", "-", money(sum(batchRows(), "paid_amount")), money(sum(batchRows(), "supplier_outstanding")), "-", ""];
  const heads = ["Batch No.", "Shelf No.", "Name", "Medicine Formula", "Stock In", "Stock Out", "Stock Remaining", "Stock Purchase Price", "Stock Purchase Price Before Tax", "Sell Price", "Cost Price", "Total Cost", "Production Date", "Expire Date", "Created at", "Supplier Name", "Paid Amount", "Supplier Outstanding", "Supplier Invoice no.", "Actions"];
  return `<section class="batch-page">
    <div class="batch-filter-grid">
      <div class="batch-filter-left">
        <div class="filter-line"><label><input type="radio" checked> Active</label><label><input type="radio"> Reported</label></div>
        <div class="filter-line"><label><input type="radio" checked> Date</label><label><input type="radio"> Date Range</label></div>
        <label class="date-field"><span>Date</span><input type="date"></label>
      </div>
      <div class="batch-filter-right">
        <div class="filter-line"><label><input type="checkbox"> Added By</label><label><input type="checkbox"> Updated By</label><select><option>All</option></select></div>
        <label class="stock-field"><span>Stock Status</span><select><option>In Stock</option><option>Out of Stock</option></select></label>
      </div>
    </div>
    <div class="batch-warning-actions">
      <div class="batch-alerts"><p class="alert-expired">Some batch medicines are <b>expired.</b></p><p class="alert-near">Some batch medicines are <b>near expiration.</b></p></div>
      <div class="batch-checks"><label><input type="checkbox"> Expired Medicines (${expiredCount})</label><label><input type="checkbox"> Near Expiry Medicines (${nearExpiry})</label><button id="toggleBatchForm" type="button">Add New Batch</button></div>
    </div>
    ${batchForm()}
    <div class="batch-toolbar"><label class="batch-search"><input placeholder="Search..."><span aria-hidden="true"></span></label><button class="print-action secondary" type="button">Print Batch History <span class="print-icon" aria-hidden="true"></span></button></div>
    <section class="batch-table-panel">${dataTable(heads, rows.concat([totals]), "batch-report-table")}</section>
    ${batchPager(rows.length)}
  </section>`;
}

function batchForm() {
  return `<div id="batchModal" class="modal-backdrop" hidden>
    <form id="batchForm" class="batch-modal-card">
      <div class="batch-modal-head"><h2>Add Batch</h2><button id="closeBatchForm" class="modal-close" type="button" aria-label="Close">×</button></div>
      <div class="batch-modal-body">
        <div class="batch-product-type"><strong>Product Type:</strong><label><input name="product_type" type="radio" value="medical" checked> Medical</label><label><input name="product_type" type="radio" value="non-medical"> Non Medical</label></div>
        <label>Bar Code <small>(Optional)</small><input name="barcode" placeholder="Enter barcode."></label>
        <label>Supplier<div class="input-action"><select name="supplier_id"><option value="">Supplier</option>${supplierRows().map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}</select><button type="button">+ Add as New</button></div></label>
        <label>Name<div class="input-action"><select name="product_id" required><option value="">Name</option>${productRows().map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select><button type="button">+ Add as New</button></div></label>
        <label>Batch No.<input name="batch_no" placeholder="Enter batch no." required></label>
        <label>Total Boxes<input name="boxQuantity" type="number" min="0" step="1" placeholder="Add no. of boxes"></label>
        <label>Units per box<input name="unitsPerBox" type="number" min="0" step="1" placeholder="Add no. of units per box"></label>
        <label>Total Stock<input name="quantity" type="number" min="0" step="1" placeholder="Add Quantity"></label>
        <label>Cost Price<div class="linked-inputs"><input name="cost_price" type="number" min="0" step="0.01" placeholder="Units Price"><span>↔</span><input name="cost_price_per_box" type="number" min="0" step="0.01" placeholder="Boxes Price"></div></label>
        <label>Sell Price<div class="linked-inputs"><input name="sell_price" type="number" min="0" step="0.01" placeholder="Units Price"><span>↔</span><input name="boxesPrice" type="number" min="0" step="0.01" placeholder="Boxes Price"></div></label>
        <label>Stock Purchase Price Before Dis.<input name="totStockBT" type="number" min="0" step="0.01" placeholder="Add Price"></label>
        <label>Extra Discount / Bonus<div class="linked-inputs"><input name="discount_percentage" type="number" min="0" step="0.01" placeholder="Percentage"><span>↔</span><input name="batch_discount" type="number" min="0" step="0.01" placeholder="Amount"></div></label>
        <label>Stock Purchase Price<input name="purchase_price" type="number" min="0" step="0.01" placeholder="Add Price"></label>
        <label>Sales Tax<div class="tax-inputs"><input name="tax_percentage" type="number" min="0" step="0.01" placeholder="Percentage"><span>↔</span><input name="tax_amount" type="number" min="0" step="0.01" placeholder="Amount"><button type="button">+</button></div></label>
        <label>Total Stock Price Before Tax<input name="purchase_price_before_tax" type="number" min="0" step="0.01" placeholder="Add Price"></label>
        <label>Expire Date<input name="expire_date" type="date"></label>
        <label>Shelf<div class="input-action"><select name="shelf_id"><option value="">Select Shelf</option>${shelfRows().map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}</select><button type="button">+ Add as New</button></div></label>
        <label>Production Date <small>(Optional)</small><input name="production_date" type="date"></label>
        <label>Paid Amount<input name="paid_amount" type="number" min="0" step="0.01" placeholder="Add Price"></label>
        <label>Supplier Outstanding<input name="supplier_outstanding" type="number" min="0" step="0.01" value="0" placeholder="Add Price"></label>
        <label>Purchasing Method<select name="payment_method"><option value="">Select Payment Method</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank Transfer</option></select></label>
        <div class="batch-extra-fields" hidden>
          <label>Maximum Discount % <small>(Optional)</small><input name="max_discount_percentage" type="number" min="0" step="0.01" placeholder="Discount %"></label>
          <label>Stock Purchase Date <small>(Optional)</small><input name="batch_purchase_date" type="date" value="${today()}"></label>
          <label>Supplier Invoice No. <small>(Optional)</small><input name="invoice_number" placeholder="Enter Invoice no. of Supplier"></label>
          <label>Expiry Reminder <small>(Optional)</small><input name="expiry_reminder" value="6 Months Before" placeholder="Set Expiry Reminder"></label>
          <label>Stock Out Reminder <small>(Optional)</small><input name="stock_out_reminder" value="30%" placeholder="Set Stock Out Reminder"></label>
        </div>
        <button id="toggleBatchMore" class="show-more" type="button"><span>i</span> Show More ›</button>
        <div></div>
        <div class="batch-modal-submit"><button type="submit">Add</button></div>
      </div>
    </form>
  </div>`;
}

function batchPager(total) {
  return `<div class="batch-pager"><div><button class="outline" disabled>&lt; BACK</button><button>1</button><button class="outline">2</button><button class="outline">3</button><button class="outline">4</button><button class="outline">NEXT &gt;</button></div><div><span>Rows per page</span><select><option>50</option><option>100</option></select><span>1-${Math.min(total, 50)} of ${total}</span></div></div>`;
}

function demandPage() {
  const rows = (state.data.demands || []).map((r) => [supplierName(r.supplier_id), productName(r.product_id), r.quantity_type, r.quantity, r.status, `<button class="icon-btn" data-remove-demand="${r.id}">×</button>`]);
  return `<section class="paper">${dataTable(["Supplier Name", "Product Name", "Type", "Quantity", "Action"], [[supplierSelect("demandSupplier"), productSelect("demandProduct"), "<select id='demandType'><option>Unit</option><option>Box</option></select>", "<input id='demandQty' type='number' placeholder='Enter Quantity'>", "<button id='addDemand'>Add To List</button>"]])}</section>
  <section class="paper"><div class="paper-head"><h2>Demand Items List</h2><button class="outline">Print Demand List</button></div>${dataTable(["Supplier Name", "Product Name", "Type", "Quantity", "Status", "Actions"], rows)}</section>`;
}

function stockAuditPage() {
  const rows = (state.data.stockAudits || []).map((r) => [productName(r.product_id), batchRows().find((b) => b.id === r.batch_id)?.batch_no || "-", r.quantity_type, r.quantity_before, r.quantity_adjusted, r.quantity_after, r.adjustment_type, money(r.amount), userName(r.user_id)]);
  const total = sum(state.data.stockAudits || [], "amount");
  return `<section class="paper">${dataTable(["Product Name", "Batch", "Type", "Quantity", "Select Adjustment", ""], [[productSelect("auditProduct"), batchSelect("auditBatch"), "<select id='auditType'><option>Unit</option><option>Box</option></select>", "<input id='auditQty' type='number' placeholder='Enter Quantity'>", "<select id='auditMode'><option>Increase</option><option>Decrease</option></select>", "<button id='addAudit'>Add To List</button>"]])}</section>
  <section class="paper"><h2>Stock Audit List</h2>${dataTable(["Product Name", "Batch No.", "Quantity Type", "Quantity Before", "Quantity Adjusted", "Quantity After", "Adjustment Type", "Amount", "By"], rows)}<div class="sale-footer"><strong>Total Amount Rs. ${money(total)}</strong><button type="button">SAVE</button></div></section>`;
}

function orderPurchasePage() {
  const rows = productRows().map((p) => [p.name, p.dose || "-", stockForProduct(p.id), Math.max(0, 10 - stockForProduct(p.id)), p.manufacturer_id || "-", ""]);
  return `<section class="paper filters"><label><input type="radio" checked> Medical</label><label><input type="radio"> Non Medical</label><input placeholder="Search..."></section><section class="paper">${dataTable(["Medicine Name", "Dose", "Total Quantity", "R. Quantity", "Manufacturer Name", "Actions"], rows)}</section>`;
}

function productPage(type) {
  const isMedical = type === "medical";
  const rows = productRows().filter((p) => isMedical ? p.type === "medical" : p.type !== "medical").map((p) => isMedical
    ? [p.name, p.medicine_formula || "-", p.dose || "-", stockForProduct(p.id), stockForProduct(p.id), p.generic_name || "-", p.category_id || "-", p.manufacturer_id || "-", ""]
    : [p.name, p.brand_name || "-", p.category_id || "-", stockForProduct(p.id), stockForProduct(p.id), ""]);
  const heads = isMedical ? ["Name", "Formula", "Dose", "Total Quantity", "Remaining Quantity", "Generic Name", "Category", "Manufacturer Name", "Actions"] : ["Name", "Brand Name", "Category", "Total Quantity", "Remaining Quantity", "Actions"];
  return `<section class="paper filters"><label><input type="radio" checked> Active ${isMedical ? "Medicines" : "Non-Medicine"}</label><label><input type="radio"> Reported ${isMedical ? "Medicines" : "Non-Medicine"}</label><input placeholder="Search..."></section>
  <section class="warning-row"><button>Products Without Stock (${productRows().filter((p) => stockForProduct(p.id) === 0).length})</button><button>Out of Stock (${productRows().filter((p) => stockForProduct(p.id) <= 0).length})</button><button>Low in Stock (${productRows().filter((p) => stockForProduct(p.id) > 0 && stockForProduct(p.id) <= 10).length})</button></section>
  ${tablePage(isMedical ? "Medical Products" : "Non Medical Products", isMedical ? "Add New Medicine" : "Add New", heads, rows)}`;
}

function purchasesPage() {
  const rows = batchRows().map((b) => [b.batch_no, productName(b.product_id), b.stock_in, money(b.purchase_price), money(b.total_cost), "-", dateFmt(b.created_at), money(b.cost_price), "0.00", b.supplier_invoice_no || "", dateFmt(b.expire_date), supplierName(b.supplier_id)]);
  return `<section class="paper filters"><button class="outline">Print Stock History</button><label>Purchase Date<input type="date"></label><input placeholder="Search..."></section><section class="paper">${dataTable(["Batch No.", "Medicine Name", "Quantity", "Rate", "Total Amt", "Extra Discount/Bonus", "Purchase Date", "Stock Cost Price", "Sales Tax", "Invoice ID", "Expire Date", "Supplier Name"], rows)}</section>`;
}

function expensePage() {
  const rows = (state.data.expenses || []).map((e) => [dateFmt(e.date), e.name, e.expense_category_id, money(e.expense_amount), ""]);
  return `<section class="paper filters"><label><input type="radio" checked> Date</label><label><input type="radio"> Date Range</label><input type="date" value="${today()}"><button class="outline">Download Expense PDF</button><button data-resource-form="expenses">Add Expense</button></section><section class="paper">${dataTable(["Date", "Name", "Expense Category", "Expense Amount", "Actions"], rows)}</section>`;
}

function staffPage() {
  const rows = staffRows().map((u) => [u.name, u.role, u.phone || "-", u.address || "-", u.email || "-", u.is_active ? "Active" : "Inactive"]);
  return `${formMarkup({ endpoint: "/api/staff", submitLabel: "Add", fields: [["name", "Name", "text", true, null, "Enter Name"], ["role", "Role", "select", true, ["manager", "pharmacist", "stock_manager", "technician"]], ["email", "Email", "email", false, null, "Enter Email"], ["phone", "Number", "text", false, null, "03xx xxxxxxxxx"], ["address", "Address", "text", false, null, "Enter Address"], ["gender", "Gender", "select", false, ["male", "female", "other"]], ["sales_pin", "Sales PIN (3 digits)", "text", false, null, "Enter 3 digit pin"], ["password", "Create 6 Digit Pin for your staff member", "password", true, null, "6 digit pin"]] })}${tablePage("Staff Management", "Add Staff", ["Name", "Role", "Phone #", "Address", "Email", "Status"], rows, "Search Name")}`;
}

function changePasswordPage() {
  return `<form id="passwordForm" class="paper password-panel"><div class="tab-row"><button type="button">Staff</button><button type="button" class="active">Admin</button></div><h2>Change Your Account Password</h2><label>Current Password<input name="current_password" type="password" autocomplete="current-password" placeholder="Enter Current Password" required></label><label>New Password<input name="new_password" type="password" autocomplete="new-password" placeholder="Enter New Password" required></label><label>Verify Password<input name="verify_password" type="password" autocomplete="new-password" placeholder="Verify New Password" required></label><button type="submit">✓ Save</button></form>`;
}

function returnPolicyPage() {
  const policies = (state.data.returnPolicies || []).map((p) => [p.description, ""]);
  const notes = (state.data.returnNotes || []).map((n) => [n.title, n.description, ""]);
  return `<section class="paper">${tableHeader("Products Return Policy", "Add New Policy")}${dataTable(["Policy Description", "Actions"], policies)}</section><section class="paper">${tableHeader("Additional Notes/Instructions", "Add New Instructions")}${dataTable(["Title", "Description", "Actions"], notes)}</section>`;
}

function renderResourcePage(content, key) {
  if (key === "shifts") {
    const rows = (state.data.shifts || []).map((s) => [userName(s.staff_id), s.shift_type, s.start_time, s.end_time, dateFmt(s.date), ""]);
    content.innerHTML = tablePage("Shift Management", "Add Shift", ["Staff", "Shift Type", "Start Time", "End Time", "Date", "Actions"], rows, "Search Name");
    return;
  }
  const cfg = resources[key];
  const rows = ((state.data[resourceDataKey(key)] || []).map(cfg.map || ((x) => x))).map((row) => cfg.columns.map(([name]) => row[name] ?? ""));
  content.innerHTML = tablePage(cfg.title, cfg.action, cfg.columns.map(([, label]) => label).concat("Actions"), rows.map((row) => row.concat("")), key === "expense-category" ? "Search Category" : "Search...");
  content.insertAdjacentHTML("afterbegin", formMarkup(cfg));
}

function resourceDataKey(key) {
  return { supplier: "suppliers", category: "categories", medicineformula: "formulas", manufacturer: "manufacturers", shelf: "shelves", "expense-category": "expenseCategories" }[key] || key;
}

function formMarkup(cfg) {
  return `<form class="paper add-form" data-endpoint="${cfg.endpoint}" hidden>${cfg.fields.map(fieldInput).join("")}<button type="submit">${cfg.submitLabel || "Save"}</button></form>`;
}

function fieldInput([name, label, type, required, options, placeholder]) {
  if (type === "select") return `<label>${label}<select name="${name}" ${required ? "required" : ""}>${options.map((o) => `<option value="${o}">${o}</option>`).join("")}</select></label>`;
  const autocomplete = type === "password" ? ' autocomplete="new-password"' : "";
  return `<label>${label}<input name="${name}" type="${type}"${autocomplete} ${type === "number" ? 'step="0.01"' : ""} ${placeholder ? `placeholder="${placeholder}"` : ""} ${required ? "required" : ""}></label>`;
}

function productSelect(id) {
  return `<select id="${id}">${productRows().map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select>`;
}

function supplierSelect(id) {
  return `<select id="${id}">${supplierRows().map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}</select>`;
}

function formNumber(form, name) {
  const value = form.elements[name]?.value;
  return value === "" || value == null ? null : Number(value);
}

function tablePage(title, action, heads, rows, searchPlaceholder = "Search...") {
  return `<section class="paper table-page">${tableHeader(title, action)}<div class="table-tools"><input placeholder="${searchPlaceholder}"><button class="outline">Print ${title}</button></div>${dataTable(heads, rows)}${pager(rows.length)}</section>`;
}

function tableHeader(title, action) {
  return `<div class="paper-head"><h2>${title}</h2>${action ? `<button class="add-action" type="button">${action}</button>` : ""}</div>`;
}

function dataTable(heads, rows, className = "") {
  return `<div class="table-wrap ${className ? `${className}-wrap` : ""}"><table class="${className}"><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${heads.length}" class="empty">No Data Found!</td></tr>`}</tbody></table></div>`;
}

function pager(total) {
  return `<div class="pager"><button class="outline">&lt; BACK</button><button>1</button><button class="outline">NEXT &gt;</button><span>Rows per page</span><select><option>50</option><option>100</option></select><span>1-${Math.min(total, 50)} of ${total}</span></div>`;
}

function bindPageActions() {
  $$("[data-route]").forEach((button) => button.addEventListener("click", () => routeTo(button.dataset.route)));
  $$("[data-sale-view]").forEach((input) => input.addEventListener("change", () => setSaleView(input.dataset.saleView)));
  $$("[data-sale-view-button]").forEach((button) => button.addEventListener("click", () => setSaleView(button.dataset.saleViewButton)));
  $$("[data-load-draft]").forEach((button) => button.addEventListener("click", () => {
    const draft = state.saleDrafts[Number(button.dataset.loadDraft)];
    if (!draft) return;
    state.saleItems = draft.items;
    state.saleDrafts.splice(Number(button.dataset.loadDraft), 1);
    persistSaleDrafts();
    setSaleView("new");
  }));
  $$("[data-delete-draft]").forEach((button) => button.addEventListener("click", () => {
    state.saleDrafts.splice(Number(button.dataset.deleteDraft), 1);
    persistSaleDrafts();
    render("newsale");
  }));
  $(".add-action")?.addEventListener("click", () => {
    const form = $(".add-form");
    if (form) form.hidden = !form.hidden;
  });
  $(".add-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, isFinite(v) && v !== "" && !["phone", "email"].includes(k) ? Number(v) : v]));
    try {
      await api(form.dataset.endpoint, { method: "POST", body: JSON.stringify(payload) });
      form.reset();
      await render();
      setNotice("Record saved.", false);
    } catch (error) { setNotice(error.message); }
  });
  $("#toggleBatchForm")?.addEventListener("click", () => {
    const modal = $("#batchModal");
    if (modal) modal.hidden = false;
  });
  const closeBatchModal = () => {
    const modal = $("#batchModal");
    const form = $("#batchForm");
    form?.reset();
    $(".batch-extra-fields")?.setAttribute("hidden", "");
    const more = $("#toggleBatchMore");
    if (more) more.innerHTML = "<span>i</span> Show More ›";
    if (modal) modal.hidden = true;
  };
  $("#cancelBatchForm")?.addEventListener("click", closeBatchModal);
  $("#closeBatchForm")?.addEventListener("click", closeBatchModal);
  $("#batchModal")?.addEventListener("click", (event) => {
    if (event.target.id === "batchModal") closeBatchModal();
  });
  $("#toggleBatchMore")?.addEventListener("click", () => {
    const extra = $(".batch-extra-fields");
    const more = $("#toggleBatchMore");
    if (!extra || !more) return;
    const open = extra.hidden;
    extra.hidden = !open;
    more.innerHTML = `<span>i</span> ${open ? "Show Less" : "Show More"} ›`;
  });
  $("#batchForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const boxes = formNumber(form, "boxQuantity") || 0;
    const unitsPerBox = formNumber(form, "unitsPerBox") || 0;
    const typedStock = formNumber(form, "quantity");
    const stockIn = typedStock != null ? typedStock : boxes * unitsPerBox;
    const purchasePrice = formNumber(form, "purchase_price");
    const totalBeforeTax = formNumber(form, "purchase_price_before_tax");
    const payload = {
      product_id: Number(form.elements.product_id.value),
      batch_no: form.elements.batch_no.value.trim(),
      shelf_id: formNumber(form, "shelf_id"),
      stock_in: stockIn,
      stock_out: 0,
      stock_remaining: stockIn,
      purchase_price: purchasePrice,
      purchase_price_before_tax: totalBeforeTax,
      sell_price: formNumber(form, "sell_price"),
      cost_price: formNumber(form, "cost_price"),
      total_cost: purchasePrice || totalBeforeTax || null,
      production_date: form.elements.production_date.value || null,
      expire_date: form.elements.expire_date.value || null,
      supplier_id: formNumber(form, "supplier_id"),
      paid_amount: formNumber(form, "paid_amount"),
      supplier_outstanding: formNumber(form, "supplier_outstanding"),
      supplier_invoice_no: form.elements.invoice_number?.value.trim() || null,
      product_type: form.elements.product_type.value,
      barcode: form.elements.barcode.value.trim() || null,
      box_quantity: boxes || null,
      units_per_box: unitsPerBox || null,
      cost_price_per_box: formNumber(form, "cost_price_per_box"),
      boxes_price: formNumber(form, "boxesPrice"),
      stock_purchase_price_before_discount: formNumber(form, "totStockBT"),
      discount_percentage: formNumber(form, "discount_percentage"),
      batch_discount: formNumber(form, "batch_discount"),
      tax_percentage: formNumber(form, "tax_percentage"),
      tax_amount: formNumber(form, "tax_amount"),
      purchasing_method: form.elements.payment_method.value || null,
      max_discount_percentage: formNumber(form, "max_discount_percentage"),
      batch_purchase_date: form.elements.batch_purchase_date?.value || null,
      expiry_reminder: form.elements.expiry_reminder?.value.trim() || null,
      stock_out_reminder: form.elements.stock_out_reminder?.value.trim() || null,
      status: "active",
    };
    if (!payload.batch_no) return setNotice("Batch No. is required.");
    if (!payload.product_id) return setNotice("Product name is required.");
    try {
      await api("/api/batches", { method: "POST", body: JSON.stringify(payload) });
      closeBatchModal();
      await render("batch");
      setNotice("Batch saved.", false);
    } catch (error) { setNotice(error.message); }
  });
  $("#saleProductInput")?.addEventListener("input", (event) => {
    $("#saleBatch").value = "";
    renderSaleSuggestions(event.currentTarget.value);
  });
  $("#saleProductInput")?.addEventListener("focus", (event) => renderSaleSuggestions(event.currentTarget.value));
  $("#saleProductSuggestions")?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-sale-batch-option]");
    if (!option) return;
    const batch = batchRows().find((row) => row.id === Number(option.dataset.saleBatchOption));
    if (!batch) return;
    $("#saleBatch").value = batch.id;
    $("#saleProductInput").value = productName(batch.product_id);
    $("#saleBarcode").value = batch.barcode || "";
    $("#saleProductSuggestions").hidden = true;
  });
  $("#addSaleItem")?.addEventListener("click", () => {
    let batch = batchRows().find((b) => b.id === Number($("#saleBatch").value));
    if (!batch) {
      const query = $("#saleProductInput")?.value || $("#saleBarcode")?.value || "";
      batch = saleSuggestionRows(query)[0];
    }
    if (!batch) return setNotice("Select a product first.");
    const qty = Number($("#saleQty").value || 1);
    state.saleItems.push({ batch_id: batch.id, product_id: batch.product_id, qt_in_box: 0, qt_in_units: qty, total_qty: qty, cost_price: Number(batch.cost_price || 0), rate: Number(batch.sell_price || 0), amount: qty * Number(batch.sell_price || 0), discount_percent: 0, discount_amount: 0 });
    render("newsale");
  });
  $$("[data-remove-sale]").forEach((button) => button.addEventListener("click", () => {
    state.saleItems.splice(Number(button.dataset.removeSale), 1);
    render("newsale");
  }));
  $("#saveDraft")?.addEventListener("click", () => {
    if (!state.saleItems.length) return setNotice("Add at least one item first.");
    state.saleDrafts.unshift({
      id: `DR-${Date.now()}`,
      date: today(),
      time: nowTime(),
      customer_name: $("#saleCustomerName")?.value || "Walk-in",
      customer_phone: $("#saleCustomerPhone")?.value || null,
      total_payable: salePayable(),
      items: state.saleItems,
    });
    state.saleItems = [];
    persistSaleDrafts();
    setSaleView("draft");
    setNotice("Draft sale saved.", false);
  });
  $("#checkoutSale")?.addEventListener("click", checkoutSale);
  $("#addDemand")?.addEventListener("click", async () => {
    try {
      await api("/api/demands", { method: "POST", body: JSON.stringify({ supplier_id: Number($("#demandSupplier").value), product_id: Number($("#demandProduct").value), quantity_type: $("#demandType").value, quantity: Number($("#demandQty").value || 0) }) });
      await render("demand");
      setNotice("Demand item saved.", false);
    } catch (error) { setNotice(error.message); }
  });
  $$("[data-remove-demand]").forEach((button) => button.addEventListener("click", async () => {
    try {
      await api(`/api/demands/${button.dataset.removeDemand}`, { method: "DELETE" });
      await render("demand");
      setNotice("Demand item removed.", false);
    } catch (error) { setNotice(error.message); }
  }));
  $("#addAudit")?.addEventListener("click", async () => {
    try {
      await api("/api/stock-audits", { method: "POST", body: JSON.stringify({ product_id: Number($("#auditProduct").value), batch_id: Number($("#auditBatch").value), quantity_type: $("#auditType").value, quantity_adjusted: Number($("#auditQty").value || 0), adjustment_type: $("#auditMode").value }) });
      await render("stock-audit");
      setNotice("Stock adjustment saved.", false);
    } catch (error) { setNotice(error.message); }
  });
  $("#loadReturnInvoice")?.addEventListener("click", async () => {
    const invoice = $("#returnInvoice").value.trim();
    state.returnSale = saleRows().find((sale) => sale.invoice_number === invoice) || null;
    if (!state.returnSale) return setNotice("Invoice not found.");
    await render("return-item");
    setNotice("Invoice loaded.", false);
  });
  $$("[data-return-item]").forEach((button) => button.addEventListener("click", async () => {
    const input = $(`.return-qty[data-sale-item="${button.dataset.returnItem}"]`);
    if (!state.returnSale || !input) return;
    const qty = Number(input.value || 0);
    const rate = Number(input.dataset.rate || 0);
    try {
      await api("/api/returns", { method: "POST", body: JSON.stringify({ sale_id: state.returnSale.id, batch_id: Number(input.dataset.batch), qty_sold: Number(input.dataset.sold), qty_returned: qty, rate, amount: qty * rate, reason: "Customer return", refund_method: "cash", date: today() }) });
      state.returnSale = null;
      await render("returnhistory");
      setNotice("Return invoice generated.", false);
    } catch (error) { setNotice(error.message); }
  }));
  $("#returnAllInvoice")?.addEventListener("click", async () => {
    if (!state.returnSale) return;
    try {
      await api(`/api/sales/${state.returnSale.id}/return-all`, { method: "POST" });
      state.returnSale = null;
      await render("returnhistory");
      setNotice("Full return invoice generated.", false);
    } catch (error) { setNotice(error.message); }
  });
  $("#passwordForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.elements.new_password.value !== form.elements.verify_password.value) return setNotice("New passwords do not match.");
    try {
      await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password: form.elements.current_password.value, new_password: form.elements.new_password.value }) });
      form.reset();
      setNotice("Password changed.", false);
    } catch (error) { setNotice(error.message); }
  });
}

async function checkoutSale() {
  if (!state.saleItems.length) return setNotice("Add at least one item first.");
  const total = salePayable();
  try {
    const paid = Number($("#salePaid")?.value || total);
    await api("/api/sales", {
      method: "POST",
      body: JSON.stringify({
        customer_name: $("#saleCustomerName")?.value || "Walk-in",
        customer_phone: $("#saleCustomerPhone")?.value || null,
        date: today(),
        time: nowTime(),
        total_amount: total,
        discount_percent: 0,
        discount_amount: 0,
        total_payable: total,
        paid,
        due: Math.max(0, total - paid),
        change_returned: 0,
        payment_method: "cash",
        items: state.saleItems,
      }),
    });
    state.saleItems = [];
    await render("saleshistory");
    setNotice("Sale invoice generated.", false);
  } catch (error) {
    if (error.authExpired) {
      await render("dashboard");
      setNotice(error.message);
      return;
    }
    setNotice(error.message);
  }
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    const token = await api(`/api/auth/login?username=${encodeURIComponent(form.elements.username.value)}&password=${encodeURIComponent(form.elements.password.value)}`, { method: "POST" });
    state.token = token.access_token;
    localStorage.setItem("pmsToken", state.token);
    state.user = await api("/api/auth/me");
    localStorage.setItem("pmsUser", JSON.stringify(state.user));
    await render("dashboard");
  } catch (error) { setNotice(error.message); }
});

$("#registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name: form.elements.name.value, email: form.elements.email.value, password: form.elements.password.value, role: form.elements.role.value }) });
    form.reset();
    setNotice("Account created. Sign in with that email and password.", false);
  } catch (error) { setNotice(error.message); }
});

$("#logoutBtn").addEventListener("click", () => {
  clearSession();
  render("dashboard");
});

$(".menu-toggle").addEventListener("click", () => {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  localStorage.setItem("pmsSidebarCollapsed", state.sidebarCollapsed ? "1" : "0");
  updateShell();
  renderNav();
});

$("#refreshBtn").addEventListener("click", () => render(state.route));
$("#quickSaleBtn").addEventListener("click", () => {
  state.saleView = "new";
  localStorage.setItem("pmsSaleView", "new");
  routeTo("newsale");
});
window.addEventListener("hashchange", () => render(location.hash.replace("#", "") || "dashboard"));
render();
