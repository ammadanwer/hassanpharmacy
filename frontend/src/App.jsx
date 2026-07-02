import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  Calendar,
  ChevronLeft,
  ChevronDown,
  CircleDollarSign,
  Download,
  Eye,
  EyeOff,
  Grid2X2,
  KeyRound,
  LayoutDashboard,
  Menu,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Trash2,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { api, clearSession, getStoredSession, storeSession } from "./api";
import loginMedicalIllustration from "./assets/login-medical-illustration.png";

const routes = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    id: "sales",
    label: "Sales",
    icon: ShoppingCart,
    children: [
      ["newsale", "New Sale"],
      ["return-item", "Return Item"],
      ["saleshistory", "Sales History"],
      ["returnhistory", "Return History"],
      ["productsaleshistory", "Product Sales History"],
      ["customer-history", "Customer History"],
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Boxes,
    children: [
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
  { id: "staff-management", label: "Staff Management", icon: Users },
  { id: "shift-management", label: "Shift Management", icon: UserCog },
  {
    id: "daily-expense",
    label: "Daily Expense",
    icon: CircleDollarSign,
    children: [
      ["expense", "Expense"],
      ["expense-category", "Expense Category"],
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      ["change-password", "Change Password"],
      ["return-policy", "Return Policy/Notes"],
    ],
  },
  { id: "technicalhelp", label: "Get Technical Help", icon: Stethoscope },
];

const routePaths = {
  dashboard: "/pms/dashboard",
  newsale: "/pms/dashboard/newsale",
  "return-item": "/pms/dashboard/return-item",
  saleshistory: "/pms/dashboard/saleshistory",
  returnhistory: "/pms/dashboard/returnhistory",
  productsaleshistory: "/pms/dashboard/productsaleshistory",
  "customer-history": "/pms/dashboard/customer-history",
  batch: "/pms/dashboard/batch",
  demand: "/pms/dashboard/demand",
  "stock-audit": "/pms/dashboard/stock-audit",
  "order-purchase": "/pms/dashboard/order-purchase",
  medicines: "/pms/dashboard/medicines",
  nonmedicines: "/pms/dashboard/nonmedicines",
  supplier: "/pms/dashboard/supplier",
  category: "/pms/dashboard/category",
  medicineformula: "/pms/dashboard/medicineformula",
  manufacturer: "/pms/dashboard/manufacturer",
  purchases: "/pms/dashboard/purchases",
  shelf: "/pms/dashboard/shelf",
  "staff-management": "/pms/dashboard/staff-management",
  "shift-management": "/pms/dashboard/shift-management",
  expense: "/pms/dashboard/daily-expense",
  "expense-category": "/pms/dashboard/expense-category",
  "change-password": "/pms/dashboard/settings/change-password",
  "return-policy": "/pms/dashboard/return-policy",
  technicalhelp: "/pms/dashboard/technicalhelp",
};

const referenceBatchAlertCounts = {
  expired: 74,
  nearExpiry: 35,
};

const referenceDashboard = {
  productTotal: "35,63,879",
  medicalProducts: "35,62,909",
  nonMedicalProducts: "970",
  totalCost: "12,72,86,39,583.027",
  shortage: "10",
  currentMonthRevenue: 0,
  currentMonthPending: 0,
  monthOptions: ["2026-07", "2026-06", "2026-05", "2026-04", "2026-03", "2026-02", "2026-01"],
  monthlyReports: {
    "2026-07": { sold: 0, invoices: 0 },
    "2026-06": { sold: 798, invoices: 42 },
    "2026-05": { sold: 632, invoices: 38 },
    "2026-04": { sold: 793, invoices: 39 },
    "2026-03": { sold: 473, invoices: 38 },
    "2026-02": { sold: 557, invoices: 49 },
    "2026-01": { sold: 1151, invoices: 12 },
  },
  batchesInStock: "166",
  batchesOutOfStock: "42",
  expiredBatches: "59",
  frequentItems: "Panadol CF, selanz, Adalat",
};

const referenceDashboardExpiredRows = [
  ["74hh", "W LEVO 250MG TABS", "24/05/2026"],
  ["12365po", "TERBISIL", "31/01/2026"],
  ["7378m", "B BRAUN 22G", "04/02/2025"],
  ["gh899", "R PRO TAB 30'S", "04/02/2026"],
  ["kk8999", "WEBBOX BEAF DOG FOOD 2KG", "05/02/2025"],
  ["1245", "B ACTIVE DROP 20ML", "17/06/2026"],
  ["896547", "Actifed P", "28/09/2025"],
  ["2856", "Lotion", "24/11/2025"],
  ["423654", "Disprin", "01/07/2025"],
  ["622", "10CC SYRINGE", "09/01/2026"],
  ["41256", "Loprot", "10/06/2024"],
  ["47858", "Actrac", "01/10/2024"],
  ["954788", "Betaderm", "01/07/2025"],
  ["18887", "Lofexidine", "01/02/2025"],
  ["8989", "Siniry", "21/12/2024"],
  ["123456", "Gripe water", "30/09/2025"],
  ["11227p", "T DAY 5MG TAB 30S", "23/07/2025"],
  ["11227", "T DAY 5MG TAB", "23/05/2026"],
  ["133y", "PANADOL", "23/06/2025"],
  ["12557p", "Baby Lotion X", "23/08/2025"],
  ["02", "CORELEX 4MG", "27/12/2025"],
  ["7575", "Calpol", "28/12/2025"],
  ["45poo", "O CID 20MG TAB", "10/05/2026"],
  ["87451", "Dopamine", "08/05/2026"],
  ["10235", "Caflam", "19/11/2025"],
  ["88888kkk", "Sulphur", "08/08/2025"],
  ["pppcvx", "Panadol", "01/11/2025"],
  ["152578", "Transamin", "01/12/2025"],
  ["4555", "flygel", "14/03/2026"],
  ["457iiuu", "PANADOL EXTRA", "24/06/2026"],
  ["121", "Gripe water", "30/09/2025"],
  ["47856", "Flagyl", "09/06/2026"],
  ["ghh111", "0.9% SODIUM CHLORIDE 25ML", "26/12/2025"],
  ["1111", "Omeprazole risek 20", "01/09/2025"],
  ["1", "Pandol m", "24/09/2025"],
  ["45kikhgjj", "AIREEZ 5MG TAB", "31/12/2025"],
  ["45kik", "EFLOGEN CREAM 15GM", "28/02/2026"],
  ["gh899", "R PRO TAB 30'S", "06/03/2026"],
  ["34789", "Acneez", "26/09/2025"],
  ["1122", "7.5 GLOVES", "21/09/2025"],
  ["23655", "Fair and Lovely", "23/10/2025"],
  ["1222", "CRAN BEE SACH", "26/09/2025"],
  ["47856", "Flagyl", "09/06/2026"],
  ["bb123", "BBA", "02/12/2025"],
  ["12345", "Gripe water", "12/12/2025"],
  ["bb123", "BBA", "02/12/2025"],
  ["25-12-11 (1)", "Panadol CF", "22/01/2025"],
  ["897456", "TERBIDERM 125MG TAB N", "21/01/2026"],
  ["", "A DROP 10ML", "11/03/2026"],
  ["45kik", "EFLOGEN CREAM 15GM", "28/02/2026"],
  ["", "BBA", "02/12/2025"],
  ["147poutt", "Panadol", "16/05/2026"],
  ["123365", "Disprin", "12/03/2026"],
  ["56", "212 MEN NYC BODY SPRAY", "21/04/2026"],
  ["14kkkk", "aerofen 100", "21/05/2026"],
  ["47147lll", "JACK 3D PRE WORK OUT", "30/05/2026"],
  ["12544", "Toot Siah", "19/05/2026"],
];

const referenceMedicalOrderPurchaseOrder = [
  ["10 cc s", "00mg", 200, 10, "Shifa"],
  ["10cc Syringe", "10 Milliliter (mL)", 48, 0, "Shifa"],
  ["4OMG RISEK", "", 9, 0, "1"],
  ["7.5 GLOVES", "", 4, 1, "Ameer"],
  ["Actrac", "20mg", 5, 1, "Serving health"],
  ["Adalat", "30mg", 960, -61, "Bayer"],
  ["Adalat", "30mg", 4, 0, "Bayer"],
  ["Alprib 20mg", "20mg", 20, 0, "Rays pharma"],
  ["B ACTIVE SYP 120ML", "", 144, 0, "UNICORN"],
  ["bbextrin", "20 Milligram (mg)", 40, 8, "Sunshine Pharmaceuticals"],
  ["cefia", "100 Milligram (mg)", 20, 6, "Highnoon"],
  ["Dow D", "5mg/ Milliliter (mL)", 2, 0, "Martin dow"],
  ["FEFAN DS TAB", "", 20, 0, "amson"],
  ["Flagyl", "60ml", 25, 0, "Sanofi-aventis"],
  ["Furoxone", "100mg", 20, -10, "GSK"],
  ["Gyno-Travogen Vag", "5g", 5, 0, "Bayer"],
  ["J FLEX TAB", "", 15, 4, "MIKSONS"],
  ["M & M 49.3 GG", "", 12, 0, "GENERAL ITEM"],
  ["omeprazole", "", 150, -3, "2"],
  ["Omgel Podina", "", 110, 32, "1"],
  ["panadol", "3mg", 305, 52, "Novartis"],
  ["panadol", "", 400, -8, "26/A,VIA PALERMO-PARMA-ITALY"],
  ["Panadol Extra", "500mg", 900, -100, "GSK"],
  ["PANADOL TAB", "", 500, 0, "GSK"],
  ["PAN AMIN SG 500ML", "", 16, 0, "OTSUKA"],
  ["PD-CEF IM", "500mg", 31, 0, "PDH Pharma"],
  ["P DOXIME INJ 10ML", "", 1, 0, "Atco"],
  ["PLATRID AP 75/75", "75MG Milligrams per deciliter (mg/dL)", 1, 0, "SAMI"],
  ["Salazopyrin", "500mg", 10, -40, "Pfizer"],
  ["SANI PLAST", "", 200, 36, "2"],
  ["selanz", "50mg", 1200, 0, "3H HOFFMANN HUMAN HEALTH LHR."],
  ["T DAY 5MG TAB", "", 525, 50, "GlaxoSmithKline"],
  ["Transamin", "250mg", 19, 1, "Bayer"],
  ["ZYTO 250MG TAB", "", 201, 53, "High Q"],
].reduce((lookup, row, index) => {
  lookup.set(row.map((value) => String(value ?? "").trim().toLowerCase()).join("|"), index);
  return lookup;
}, new Map());

const referenceNonMedicalOrderPurchaseDose = new Map([
  ["enliten whitening bar", "20ml"],
]);

const pathRoutes = Object.fromEntries(Object.entries(routePaths).map(([route, path]) => [path, route]));

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plainMoney = (value) => Number(value || 0).toFixed(2);
const fixedMoney = (value) => Number(value || 0).toFixed(2);
const referenceMoney = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
const formatCompactNumber = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const referenceOrderPurchaseKey = (row) => [row.name, row.dose || "", row.total_quantity, row.remaining_quantity, row.manufacturer_name || ""].map((value) => String(value ?? "").trim().toLowerCase()).join("|");
const referenceOrderPurchaseIndex = (row) => referenceMedicalOrderPurchaseOrder.get(referenceOrderPurchaseKey(row));
const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
const roundPercent = (value) => Math.round(Number(value || 0) * 100) / 100;
const unpackPaged = (result) => Array.isArray(result) ? { items: result, total: result.length } : { ...result, items: result?.items || [], total: Number(result?.total || 0) };
const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};
const nowTime = () => new Date().toTimeString().slice(0, 5);
const localReturnInvoiceNumber = () => {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
    String(date.getMilliseconds()).padStart(3, "0"),
  ].join("");
  return `RET-${stamp}`;
};

const alwaysAllowedRoutes = new Set(["change-password", "technicalhelp"]);
const routePermissionMap = {
  dashboard: ["pharmacy_dashboard", "view"],
  newsale: ["new_sale", "view"],
  "return-item": ["sales_return", "add"],
  saleshistory: ["sales_history", "view"],
  returnhistory: ["sales_return_history", "view"],
  productsaleshistory: ["sales_history", "view"],
  "customer-history": ["sales_history", "view"],
  batch: ["batch", "view"],
  demand: ["demand_order", "view"],
  "stock-audit": ["audit_batch", "add"],
  "order-purchase": ["demand_order", "view"],
  medicines: ["medical_product", "view"],
  nonmedicines: ["non_medical_product", "view"],
  supplier: ["supplier", "view"],
  category: ["category", "view"],
  medicineformula: ["medicine_formula", "view"],
  manufacturer: ["manufacturer", "view"],
  purchases: ["batch", "view"],
  shelf: ["batch", "view"],
  "staff-management": ["pharmacy_component", "view"],
  "shift-management": ["pharmacy_component", "view"],
  expense: ["daily_expense", "view"],
  "expense-category": ["expense_category", "view"],
  "return-policy": ["pharmacy_component", "view"],
};

function isFullAccessUser(user) {
  return ["owner", "admin"].includes(user?.role);
}

function userHasPermission(user, moduleKey, action = "view") {
  if (!user || isFullAccessUser(user)) return true;
  const permissions = normalizeStaffPermissions(user.permissions);
  return Boolean(permissions?.[moduleKey]?.[action]);
}

function canAccessRoute(user, route) {
  if (!route || route === "not-found" || alwaysAllowedRoutes.has(route)) return true;
  const requirement = routePermissionMap[route];
  if (!requirement) return isFullAccessUser(user);
  return userHasPermission(user, requirement[0], requirement[1]);
}

function firstAllowedRoute(user) {
  if (canAccessRoute(user, "dashboard")) return "dashboard";
  for (const item of routes) {
    if (!item.children && canAccessRoute(user, item.id)) return item.id;
    const child = item.children?.find(([id]) => canAccessRoute(user, id));
    if (child) return child[0];
  }
  return "change-password";
}

function filterRoutesForUser(user) {
  return routes
    .map((item) => {
      if (item.children) {
        const children = item.children.filter(([id]) => canAccessRoute(user, id));
        return children.length ? { ...item, children } : null;
      }
      return canAccessRoute(user, item.id) ? item : null;
    })
    .filter(Boolean);
}

const defaultPharmacyProfile = {
  name: "Hassan Pharmacy",
  customerService: "03324122333",
  country: "Pakistan",
  city: "Karachi",
  address: "DHA phase 2 extension",
  email: "haseebkiani44@gmail.com",
  regNumber: "121122",
  licenseNumber: "1",
  licenseExpiry: "30/11/2028",
  operatingHours: "10am-6pm",
  pinRequired: false,
  logoDataUrl: "",
};

function normalizePharmacyProfile(profile = {}) {
  return {
    name: profile.name || defaultPharmacyProfile.name,
    customerService: profile.customer_service ?? profile.customerService ?? defaultPharmacyProfile.customerService,
    country: profile.country ?? defaultPharmacyProfile.country,
    city: profile.city ?? defaultPharmacyProfile.city,
    address: profile.address ?? defaultPharmacyProfile.address,
    email: profile.email ?? defaultPharmacyProfile.email,
    regNumber: profile.reg_number ?? profile.regNumber ?? defaultPharmacyProfile.regNumber,
    licenseNumber: profile.license_number ?? profile.licenseNumber ?? defaultPharmacyProfile.licenseNumber,
    licenseExpiry: profile.license_expiry ?? profile.licenseExpiry ?? defaultPharmacyProfile.licenseExpiry,
    operatingHours: profile.operating_hours ?? profile.operatingHours ?? defaultPharmacyProfile.operatingHours,
    pinRequired: profile.pin_required ?? profile.pinRequired ?? defaultPharmacyProfile.pinRequired,
    logoDataUrl: profile.logo_data_url ?? profile.logoDataUrl ?? defaultPharmacyProfile.logoDataUrl,
  };
}

function serializePharmacyProfile(profile) {
  return {
    name: profile.name,
    customer_service: profile.customerService,
    country: profile.country,
    city: profile.city,
    address: profile.address,
    email: profile.email,
    reg_number: profile.regNumber,
    license_number: profile.licenseNumber,
    license_expiry: profile.licenseExpiry,
    operating_hours: profile.operatingHours,
    pin_required: profile.pinRequired,
    logo_data_url: profile.logoDataUrl || null,
  };
}

function ProfileAvatar({ profile }) {
  return (
    <div className="profile-avatar" aria-hidden="true">
      {profile.logoDataUrl ? <img src={profile.logoDataUrl} alt="" /> : <span>HP</span>}
    </div>
  );
}

export default function App() {
  const saved = useMemo(getStoredSession, []);
  const [token, setToken] = useState(saved.token);
  const [user, setUser] = useState(saved.user);
  const [route, setRouteState] = useState(routeFromLocation);
  const [openGroups, setOpenGroups] = useState(() => openGroupsForRoute(routeFromLocation()));
  const [collapsed, setCollapsed] = useState(false);
  const [data, setData] = useState(emptyData());
  const [pharmacyProfile, setPharmacyProfile] = useState(defaultPharmacyProfile);
  const [notice, setNotice] = useState("");
  const [saleItems, setSaleItems] = useState([]);
  const [batchModal, setBatchModal] = useState(null);
  const [crudModal, setCrudModal] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [productRouteFilter, setProductRouteFilter] = useState("");
  const [batchRouteAlertFilter, setBatchRouteAlertFilter] = useState("");
  const accountMenuRef = useRef(null);
  const visibleRoutes = useMemo(() => filterRoutesForUser(user), [user]);

  const apiCall = (path, options) => api(path, options, token);

  function setRoute(nextRoute, options = {}) {
    const requestedRoute = routePaths[nextRoute] ? nextRoute : "dashboard";
    const normalizedRoute = canAccessRoute(user, requestedRoute) ? requestedRoute : firstAllowedRoute(user);
    setProductRouteFilter(["medicines", "nonmedicines"].includes(normalizedRoute) ? (options.stockFilter || "") : "");
    setBatchRouteAlertFilter(normalizedRoute === "batch" ? (options.alertFilter || "") : "");
    setRouteState(normalizedRoute);
    const group = parentGroupForRoute(normalizedRoute);
    if (group) setOpenGroups(new Set([group]));
    const nextPath = routePaths[normalizedRoute] || routePaths.dashboard;
    if (window.location.pathname !== nextPath) {
      const method = options.replace ? "replaceState" : "pushState";
      window.history[method]({ route: normalizedRoute }, "", nextPath);
    }
  }

  useEffect(() => {
    if (!routePaths[route] && route !== "not-found") setRoute("dashboard", { replace: true });
    const onPopState = () => {
      const requestedRoute = routeFromLocation();
      const nextRoute = canAccessRoute(user, requestedRoute) ? requestedRoute : firstAllowedRoute(user);
      setRouteState(nextRoute);
      const group = parentGroupForRoute(nextRoute);
      if (group) setOpenGroups((current) => new Set([...current, group]));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [user]);

  useEffect(() => {
    if (token && route !== "not-found" && !canAccessRoute(user, route)) {
      setRoute(firstAllowedRoute(user), { replace: true });
    }
  }, [token, user, route]);

  useEffect(() => {
    if (!token) return;
    loadCoreData().catch((error) => handleApiError(error));
  }, [token]);

  useEffect(() => {
    function closeAccountMenu(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", closeAccountMenu);
    return () => document.removeEventListener("mousedown", closeAccountMenu);
  }, []);

  async function loadCoreData() {
    const calls = {
      products: "/api/products?limit=5000",
      batches: "/api/batches?limit=5000",
      sales: "/api/sales?limit=500",
      suppliers: "/api/suppliers?limit=5000",
      shelves: "/api/shelves?limit=5000",
      staff: "/api/staff?limit=500",
      categories: "/api/categories?limit=5000",
      formulas: "/api/medicine-formulas?limit=5000",
      manufacturers: "/api/manufacturers?limit=5000",
      demands: "/api/demands?limit=500",
      purchaseOrders: "/api/purchase-orders?limit=500",
      stockAudits: "/api/stock-audits?limit=500",
      returns: "/api/returns?limit=500",
      customers: "/api/customers?limit=500",
      expenses: "/api/expenses?limit=500",
      expenseCategories: "/api/expense-categories?limit=500",
      shifts: "/api/shifts?limit=500",
      returnPolicies: "/api/return-policies?limit=500",
      returnNotes: "/api/return-notes?limit=500",
      pharmacyProfile: "/api/pharmacy-profile",
    };
    const fallback = emptyData();
    const entries = await Promise.all(Object.entries(calls).map(async ([key, path]) => {
      try {
        return [key, await apiCall(path)];
      } catch (error) {
        if (error.status === 403) return [key, fallback[key]];
        throw error;
      }
    }));
    const nextData = { ...fallback, ...Object.fromEntries(entries) };
    setPharmacyProfile(normalizePharmacyProfile(nextData.pharmacyProfile));
    setData(nextData);
  }

  function handleApiError(error) {
    if (error.status === 401) {
      clearSession();
      setToken("");
      setUser(null);
      setData(emptyData());
      setPharmacyProfile(defaultPharmacyProfile);
    }
    setNotice(error.message);
  }

  async function onLogin(username, password) {
    setNotice("");
    try {
      const auth = await api(`/api/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, { method: "POST" });
      const me = await api("/api/auth/me", {}, auth.access_token);
      storeSession(auth.access_token, me);
      setToken(auth.access_token);
      setUser(me);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function onRegister(payload) {
    setNotice("");
    try {
      await api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
      setNotice("Account created. Sign in with that email and password.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  function logout() {
    clearSession();
    setToken("");
    setUser(null);
    setData(emptyData());
    setPharmacyProfile(defaultPharmacyProfile);
    setRoute("dashboard");
  }

  if (!token) {
    return <AuthScreen notice={notice} onLogin={onLogin} onRegister={onRegister} />;
  }

  if (route === "not-found") {
    return <NotFoundPage setRoute={setRoute} />;
  }

  return (
    <div className={`app ${collapsed ? "collapsed" : ""}`}>
      <Sidebar routes={visibleRoutes} route={route} setRoute={setRoute} openGroups={openGroups} setOpenGroups={setOpenGroups} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main>
        <header className="topbar">
          <div className="header-left">
            <button className="icon-button sidebar-toggle" type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)}>
              <Menu size={25} />
              {!collapsed ? <ChevronLeft size={19} /> : null}
            </button>
            {canAccessRoute(user, "newsale") ? <button className="primary" onClick={() => setRoute("newsale")}>Add New Sale</button> : null}
          </div>
          <div className="header-right" ref={accountMenuRef}>
            <span className="renew-badge">HP</span>
            <button className="renew-link" type="button" onClick={() => setProfileOpen(true)}>Renew</button>
            <span>{pharmacyProfile.name}</span>
            <button className="icon-button" type="button" aria-label="Open account menu" onClick={() => setAccountOpen((value) => !value)}><MoreVertical /></button>
            {accountOpen ? <div className="account-menu">
              <button type="button" onClick={() => { setAccountOpen(false); setProfileOpen(true); }}>Profile</button>
              <button type="button" onClick={() => { setAccountOpen(false); logout(); }}>Logout</button>
            </div> : null}
          </div>
        </header>
        {notice ? <div className="notice">{notice}</div> : null}
        <section className="content">
          {route === "dashboard" && <Dashboard data={data} setRoute={setRoute} apiCall={apiCall} onError={handleApiError} />}
          {route === "newsale" && <NewSale data={data} saleItems={saleItems} setSaleItems={setSaleItems} apiCall={apiCall} onError={handleApiError} setNotice={setNotice} reload={loadCoreData} />}
          {route === "batch" && <BatchPage data={data} initialAlertFilter={batchRouteAlertFilter} openModal={(row = null) => setBatchModal({ row })} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "return-item" && <ReturnItemPage data={data} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "saleshistory" && <SalesHistoryPage data={data} apiCall={apiCall} onError={handleApiError} />}
          {route === "returnhistory" && <ReturnHistoryPage data={data} apiCall={apiCall} onError={handleApiError} />}
          {route === "productsaleshistory" && <ProductSalesHistoryPage data={data} apiCall={apiCall} onError={handleApiError} />}
          {route === "customer-history" && <CustomerHistoryPage data={data} apiCall={apiCall} onError={handleApiError} />}
          {route === "demand" && <DemandPage data={data} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "stock-audit" && <StockAuditPage data={data} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "order-purchase" && <OrderPurchasePage data={data} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "medicines" && <ProductsPage type="medical" initialStockFilter={productRouteFilter} data={data} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "nonmedicines" && <ProductsPage type="non-medical" initialStockFilter={productRouteFilter} data={data} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "supplier" && <CrudPage config={crudConfigs.supplier} rows={data.suppliers} openModal={(row = null) => setCrudModal({ type: "supplier", row })} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "category" && <CrudPage config={crudConfigs.category} rows={data.categories} openModal={(row = null) => setCrudModal({ type: "category", row })} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "medicineformula" && <CrudPage config={crudConfigs.medicineformula} rows={data.formulas} openModal={(row = null) => setCrudModal({ type: "medicineformula", row })} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "manufacturer" && <CrudPage config={crudConfigs.manufacturer} rows={data.manufacturers} openModal={(row = null) => setCrudModal({ type: "manufacturer", row })} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "purchases" && <StockPurchasePage apiCall={apiCall} onError={handleApiError} />}
          {route === "shelf" && <ShelfPage data={data} openModal={(row = null) => setCrudModal({ type: "shelf", row })} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "staff-management" && <StaffPage data={data} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "shift-management" && <ShiftPage data={data} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "expense" && <ExpensePage data={data} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "expense-category" && <CrudPage config={crudConfigs.expenseCategory} rows={data.expenseCategories} openModal={(row = null) => setCrudModal({ type: "expenseCategory", row })} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "change-password" && <ChangePasswordPage data={data} apiCall={apiCall} onError={handleApiError} setNotice={setNotice} />}
          {route === "return-policy" && <ReturnPolicyPage data={data} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} />}
          {route === "technicalhelp" && <TechnicalHelpPage setRoute={setRoute} />}
        </section>
      </main>
      {batchModal ? <BatchModal data={data} row={batchModal.row} close={() => setBatchModal(null)} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} /> : null}
      {crudModal ? <CrudModal config={crudConfigs[crudModal.type]} row={crudModal.row} close={() => setCrudModal(null)} apiCall={apiCall} reload={loadCoreData} onError={handleApiError} /> : null}
      {profileOpen ? <PharmacyProfileModal profile={pharmacyProfile} close={() => setProfileOpen(false)} apiCall={apiCall} onError={handleApiError} onSave={setPharmacyProfile} /> : null}
    </div>
  );
}

function PharmacyProfileModal({ profile: savedProfile, close, apiCall, onError, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(() => normalizePharmacyProfile(savedProfile));
  const [draft, setDraft] = useState(() => normalizePharmacyProfile(savedProfile));

  useEffect(() => {
    const normalized = normalizePharmacyProfile(savedProfile);
    setProfile(normalized);
    if (!editing) setDraft(normalized);
  }, [savedProfile, editing]);

  const rows = [
    ["City", profile.city],
    ["Address", profile.address],
    ["Email", profile.email],
    ["Customer Service #", profile.customerService],
    ["Reg Number", profile.regNumber],
    ["License Number", profile.licenseNumber],
    ["License Expiry", profile.licenseExpiry],
    ["Operating Hours", profile.operatingHours],
    ["PIN Required For Sales", profile.pinRequired ? "Enabled" : "Disabled"],
  ];
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const startEdit = () => {
    setDraft(profile);
    setEditing(true);
  };
  const updateLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateDraft("logoDataUrl", String(reader.result || ""));
    reader.readAsDataURL(file);
  };
  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = normalizePharmacyProfile(await apiCall("/api/pharmacy-profile", {
        method: "PUT",
        body: JSON.stringify(serializePharmacyProfile(draft)),
      }));
      setProfile(updated);
      setDraft(updated);
      onSave(updated);
      setEditing(false);
    } catch (error) {
      onError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="simple-modal profile-modal">
        <div className="modal-head"><h2>Pharmacy Profile</h2><button type="button" aria-label="close" onClick={close}><X /></button></div>
        {editing ? (
          <form className="profile-edit-form" onSubmit={saveProfile}>
            <div className="profile-edit-photo">
              <ProfileAvatar profile={draft} />
              <label className="profile-upload">
                <input type="file" accept="image/jpeg,image/gif,image/png,application/,image/x-eps" onChange={updateLogo} />
                <span>Upload New Photo</span>
              </label>
            </div>
            <label>Name<input type="text" placeholder="Enter name" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} /></label>
            <label>Customer Service Number<input type="text" placeholder="Customer Service Number" value={draft.customerService} onChange={(event) => updateDraft("customerService", event.target.value)} /></label>
            <label>Country<input type="text" placeholder="Country" value={draft.country} onChange={(event) => updateDraft("country", event.target.value)} /></label>
            <label>City<input type="text" value={draft.city} onChange={(event) => updateDraft("city", event.target.value)} /></label>
            <label>Address<input type="text" placeholder="Address" value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} /></label>
            <label>Registration No.<input type="text" placeholder="Pharmacy Reg#" value={draft.regNumber} onChange={(event) => updateDraft("regNumber", event.target.value)} /></label>
            <label>License Number<input type="text" placeholder="License Number#" value={draft.licenseNumber} onChange={(event) => updateDraft("licenseNumber", event.target.value)} /></label>
            <label>License expiry Date<input type="tel" placeholder="dd/mm/yyyy" value={draft.licenseExpiry} onChange={(event) => updateDraft("licenseExpiry", event.target.value)} /></label>
            <label>Operating Hours<input type="text" placeholder="Operating Hours" value={draft.operatingHours} onChange={(event) => updateDraft("operatingHours", event.target.value)} /></label>
            <label className="profile-checkbox">Required PIN for Sales<input type="checkbox" checked={draft.pinRequired} onChange={(event) => updateDraft("pinRequired", event.target.checked)} /></label>
            <div className="profile-edit-actions">
              <button className="primary" type="submit" disabled={saving}>{saving ? "Updating..." : "Update"}</button>
            </div>
          </form>
        ) : (
          <div className="profile-body">
            <ProfileAvatar profile={profile} />
            <div className="profile-main">
              <h3>Pharmacy Name: <strong>{profile.name}</strong></h3>
              <div className="profile-detail-list">
                {rows.map(([label, value]) => <p key={label}>{label}: <strong>{value}</strong></p>)}
              </div>
            </div>
            <button className="profile-edit-button" type="button" aria-label="Edit pharmacy profile" onClick={startEdit}><Pencil size={18} /></button>
          </div>
        )}
      </section>
    </div>
  );
}

function emptyData() {
  return {
    products: [],
    batches: [],
    sales: [],
    suppliers: [],
    shelves: [],
    staff: [],
    categories: [],
    formulas: [],
    manufacturers: [],
    demands: [],
    purchaseOrders: [],
    stockAudits: [],
    returns: [],
    customers: [],
    expenses: [],
    expenseCategories: [],
    shifts: [],
    returnPolicies: [],
    returnNotes: [],
    pharmacyProfile: defaultPharmacyProfile,
  };
}

function routeFromLocation() {
  const pathname = window.location.pathname.replace(/\/$/, "") || "/";
  if (pathRoutes[pathname]) return pathRoutes[pathname];
  if (pathname === "/" || pathname === "/pms" || pathname === "/pms/dashboard") return "dashboard";
  const lastSegment = pathname.split("/").filter(Boolean).at(-1);
  return pathRoutes[`/pms/dashboard/${lastSegment}`] || "not-found";
}

function parentGroupForRoute(route) {
  return routes.find((item) => item.children?.some(([id]) => id === route))?.id || null;
}

function openGroupsForRoute(route) {
  const group = parentGroupForRoute(route);
  return group ? new Set([group]) : new Set();
}

function activeLabel(route) {
  for (const item of routes) {
    if (item.id === route) return item.label;
    const child = item.children?.find(([id]) => id === route);
    if (child) return child[1];
  }
  return "Dashboard";
}

function NotFoundPage({ setRoute }) {
  return (
    <main className="not-found-page">
      <section>
        <h1>404: The page you are looking for isn't here</h1>
        <p>You either tried some shady route or you came here by mistake. Whichever it is, try using the navigation</p>
        <button className="primary" type="button" onClick={() => setRoute("dashboard", { replace: true })}>GO BACK TO DASHBOARD</button>
      </section>
    </main>
  );
}

function Brand({ compact = false }) {
  return (
    <div className="brand">
      <div className="brand-mark"><span>H</span><Plus size={15} /></div>
      {!compact ? <div><strong>Hassan</strong><small>Pharmacy</small></div> : null}
    </div>
  );
}

function AuthScreen({ notice, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [login, setLogin] = useState({ username: "", password: "" });
  const [register, setRegister] = useState({ name: "", email: "", password: "", role: "owner" });
  const [forgot, setForgot] = useState({ identifier: "", error: "", sent: false });
  function showMode(nextMode) {
    setMode(nextMode);
    if (nextMode !== "forgot") setForgot({ identifier: "", error: "", sent: false });
  }
  function submitForgot(event) {
    event.preventDefault();
    if (!forgot.identifier.trim()) {
      setForgot((current) => ({ ...current, error: "Email or Phone number is required", sent: false }));
      return;
    }
    setForgot((current) => ({ ...current, error: "", sent: true }));
  }
  return (
    <div className="auth-screen">
      <div className="auth-art">
        <img className="auth-illustration" src={loginMedicalIllustration} alt="" aria-hidden="true" />
      </div>
      <div className="auth-side">
        <Brand />
        <p className="auth-subtitle">Pharmacy Management System</p>
        {mode !== "forgot" ? <div className="role-row"><label><input type="radio" checked readOnly /> Owner / Admin</label><label><input type="radio" readOnly /> Staff</label></div> : null}
        {notice ? <div className="notice auth-notice">{notice}</div> : null}
        {mode === "login" ? (
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onLogin(login.username, login.password); }}>
            <input placeholder="Mobile Number or Email" value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} />
            <AuthPasswordInput placeholder="Password" value={login.password} onChange={(value) => setLogin({ ...login, password: value })} />
            <button className="primary">Login</button>
            <button className="text-button" type="button" onClick={() => showMode("forgot")}>Forgot Password ?</button>
            <p>Don't have an account yet? <button className="link-button" type="button" onClick={() => showMode("register")}>Signup</button></p>
          </form>
        ) : mode === "register" ? (
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onRegister(register); }}>
            <input placeholder="Name" value={register.name} onChange={(event) => setRegister({ ...register, name: event.target.value })} />
            <input placeholder="Email" value={register.email} onChange={(event) => setRegister({ ...register, email: event.target.value })} />
            <AuthPasswordInput placeholder="Password" value={register.password} onChange={(value) => setRegister({ ...register, password: value })} />
            <button className="primary">Create account</button>
            <p>Already have an account? <button className="link-button" type="button" onClick={() => showMode("login")}>Login</button></p>
          </form>
        ) : (
          <form className="auth-form forgot-form" onSubmit={submitForgot} noValidate>
            <div className="forgot-title">Forgot Password?</div>
            <div className="forgot-copy">Please enter the number associated with your account</div>
            <label className={`auth-floating-field ${forgot.error ? "has-error" : ""}`}>
              <span>Mobile Number or Email</span>
              <input
                aria-invalid={Boolean(forgot.error)}
                value={forgot.identifier}
                onChange={(event) => setForgot({ identifier: event.target.value, error: "", sent: false })}
              />
              {forgot.error ? <small>{forgot.error}</small> : null}
            </label>
            {forgot.sent ? <div className="forgot-success">If this account exists, password reset instructions will be sent.</div> : <div className="forgot-spacer" />}
            <button className="primary" type="submit">Continue</button>
            <p>Don't have an account yet? <button className="link-button" type="button" onClick={() => showMode("register")}>Signup</button></p>
          </form>
        )}
      </div>
    </div>
  );
}

function AuthPasswordInput({ placeholder, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="auth-password-wrap">
      <input type={visible ? "text" : "password"} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      <button type="button" className="auth-password-toggle" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((current) => !current)}>
        {visible ? <Eye size={23} /> : <EyeOff size={23} />}
      </button>
    </span>
  );
}

function Sidebar({ routes, route, setRoute, openGroups, setOpenGroups, collapsed, setCollapsed }) {
  function toggleGroup(groupId) {
    if (collapsed) setCollapsed(false);
    setOpenGroups((current) => current.has(groupId) ? new Set() : new Set([groupId]));
  }
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Brand />
        <p>Pharmacy Management System</p>
      </div>
      <nav>
        {routes.map((item) => {
          const Icon = item.icon;
          const active = item.id === route || item.children?.some(([id]) => id === route);
          return (
            <div key={item.id}>
              <button title={item.label} className={`nav-button ${active ? "active" : ""}`} onClick={() => item.children ? toggleGroup(item.id) : setRoute(item.id)}>
                <Icon size={19} /><span>{item.label}</span>{item.children ? <ChevronDown size={15} /> : null}
              </button>
              {item.children && openGroups.has(item.id) ? <div className="subnav">{item.children.map(([id, label]) => <button title={label} key={id} className={route === id ? "active" : ""} onClick={() => setRoute(id)}>{label}</button>)}</div> : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function Dashboard({ data, setRoute, apiCall, onError }) {
  const [reportMonth, setReportMonth] = useState(referenceDashboard.monthOptions[0]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [monthSummary, setMonthSummary] = useState(null);
  const activeSales = data.sales.filter((sale) => sale.status !== "draft");
  const activeProducts = data.products.filter((product) => product.status !== "reported");
  const todaySales = activeSales.filter((sale) => sale.date === today());
  const monthSales = activeSales.filter((sale) => String(sale.date || "").startsWith(reportMonth));
  const monthOptions = referenceDashboard.monthOptions;
  const monthSelectOptions = monthOptions.map((month) => ({ id: month, name: formatMonth(month) }));
  const currentMonth = today().slice(0, 7);
  const currentMonthStart = `${currentMonth}-01`;
  const currentMonthEnd = `${currentMonth}-${String(new Date(Number(currentMonth.slice(0, 4)), Number(currentMonth.slice(5, 7)), 0).getDate()).padStart(2, "0")}`;
  useEffect(() => {
    if (!apiCall) return;
    const timer = setTimeout(async () => {
      try {
        const todayParams = new URLSearchParams({ date_from: today(), date_to: today() });
        const monthParams = new URLSearchParams({ date_from: currentMonthStart, date_to: currentMonthEnd });
        const [dayTotals, monthTotals] = await Promise.all([
          apiCall(`/api/reports/sales-summary?${todayParams.toString()}`),
          apiCall(`/api/reports/sales-summary?${monthParams.toString()}`),
        ]);
        setTodaySummary(dayTotals);
        setMonthSummary(monthTotals);
      } catch (error) {
        onError?.(error);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [apiCall, currentMonthEnd, currentMonthStart, onError]);
  const todayRevenue = todaySummary ? Number(todaySummary.net_sales || 0) : todaySales.reduce((sum, row) => sum + Number(row.total_payable || 0), 0);
  const monthRevenue = referenceDashboard.currentMonthRevenue ?? (monthSummary ? Number(monthSummary.net_sales || 0) : activeSales.filter((sale) => String(sale.date || "").startsWith(currentMonth)).reduce((sum, row) => sum + Number(row.total_payable || 0), 0));
  const monthPending = referenceDashboard.currentMonthPending ?? (monthSummary ? Number(monthSummary.pending || 0) : activeSales.filter((sale) => String(sale.date || "").startsWith(currentMonth)).reduce((sum, row) => sum + Number(row.due || 0), 0));
  const soldThisMonth = monthSales.reduce((sum, sale) => sum + (sale.items || []).reduce((itemSum, item) => itemSum + Number(item.total_qty || 0), 0), 0);
  const capturedMonthlyReport = referenceDashboard.monthlyReports[reportMonth];
  const reportSold = capturedMonthlyReport ? capturedMonthlyReport.sold : soldThisMonth;
  const reportInvoices = capturedMonthlyReport ? capturedMonthlyReport.invoices : monthSales.length;
  return (
    <>
      <section className="kpis">
        <Kpi tone="mint" icon={<CircleDollarSign />} value={`Rs. ${referenceMoney(todayRevenue)}`} label="Today's Net Sale" />
        <Kpi tone="cream" icon={<Calendar />} value={`Rs. ${referenceMoney(monthRevenue)}`} label="Monthly Revenue" sub={`Pending: ${referenceMoney(monthPending)}`} actionLabel="VIEW DETAILS" onAction={() => setRoute("saleshistory")} />
        <Kpi tone="lavender" icon={<Grid2X2 />} value={referenceDashboard.productTotal} label="All Products" sub={`Medical: ${referenceDashboard.medicalProducts} | Non-Medical: ${referenceDashboard.nonMedicalProducts}`} />
        <Kpi tone="peach" icon={<Plus />} value={referenceDashboard.totalCost} label="Total Cost" />
        <article className="shortage"><strong>{referenceDashboard.shortage}</strong><span>Medicine Shortage</span><button onClick={() => setRoute("medicines", { stockFilter: "low_stock" })}>Resolve Now &raquo;</button></article>
      </section>
      <section className="dashboard-grid">
        <Panel title="List of Expired Medicine Batch">
          <div className="panel-link-row"><button className="text-button" type="button" onClick={() => setRoute("batch", { alertFilter: "expired" })}>View Expired Batches &raquo;</button></div>
          {referenceDashboardExpiredRows.length ? <div className="mini-table-wrap"><table className="mini-table"><tbody>{referenceDashboardExpiredRows.map(([batchNo, productName, expireDate], index) => (
            <tr key={`${batchNo || "blank"}-${index}`}><td>{batchNo}</td><td>{productName}</td><td>{expireDate}</td></tr>
          ))}</tbody></table></div> : <p className="empty">No expired batches found.</p>}
        </Panel>
        <Panel title="Quick Monthly Report">
          <div className="month-select"><SelectField hideLabel label="Quick Monthly Report Month" value={reportMonth} onChange={setReportMonth} options={monthSelectOptions} placeholder="Select Month" /></div>
          <div className="quick-report two">
            <div><strong>{formatCompactNumber(reportSold)}</strong><span>Qty of Products Sold</span></div>
            <div><strong>{formatCompactNumber(reportInvoices)}</strong><span>Invoices Generated</span></div>
          </div>
        </Panel>
        <Panel title="Medicine Batches Overview" className="dashboard-wide">
          <div className="panel-link-row"><button className="text-button" type="button" onClick={() => setRoute("batch")}>Go To Batch Management &raquo;</button></div>
          <div className="quick-report four">
            <div><strong>{referenceDashboard.batchesInStock}</strong><span>Batches in Stock</span></div>
            <div><strong>{referenceDashboard.batchesOutOfStock}</strong><span>Batches out of Stock</span></div>
            <div><strong>{referenceDashboard.expiredBatches}</strong><span>Expired Batches</span></div>
            <div><strong>{referenceDashboard.frequentItems}</strong><span>Frequently bought Item(s)</span></div>
          </div>
        </Panel>
      </section>
    </>
  );
}

function Kpi({ tone, icon, value, label, sub, actionLabel, onAction }) {
  return <article className={`kpi ${tone}`}>{icon}<strong>{value}</strong><span>{label}</span>{sub ? <small>{sub}</small> : null}{actionLabel ? <button type="button" onClick={onAction}>{actionLabel}</button> : null}</article>;
}

function formatMonth(value) {
  const [year, month] = String(value || "").split("-");
  if (!year || !month) return value || "";
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function renderBatchPrice(value) {
  const text = String(value || "-").trim();
  const match = text.match(/^(.*?\/unit)\s+(.+)$/);
  if (!match) return text || "-";
  return <>{match[1]}<br />{match[2]}</>;
}

function formatMedicineFormula(value) {
  const text = String(value || "").trim();
  if (!text) return "-";
  const referenceFormulaNames = {
    paracetamol: "Paracetamol",
    aspirin: "Aspirin",
    metronidazole: "Metronidazole",
  };
  return referenceFormulaNames[text.toLowerCase()] || text;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function Panel({ title, children, className = "" }) {
  return <section className={`panel ${className}`.trim()}><div className="panel-head"><h2>{title}</h2></div>{children}</section>;
}

function NewSale({ data, saleItems, setSaleItems, apiCall, onError, setNotice, reload }) {
  const [saleTab, setSaleTab] = useState("new");
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [editingSaleSnapshot, setEditingSaleSnapshot] = useState(null);
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [saleType, setSaleType] = useState("Unit");
  const [qty, setQty] = useState("");
  const [paid, setPaid] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [customer, setCustomer] = useState({ name: "Walk-in", phone: "" });
  const [checkoutDiscountAmount, setCheckoutDiscountAmount] = useState("");
  const [checkoutDiscountPercent, setCheckoutDiscountPercent] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receiveNow, setReceiveNow] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [saleListPage, setSaleListPage] = useState(1);
  const [saleListPageSize, setSaleListPageSize] = useState(10);
  const [recentSales, setRecentSales] = useState([]);
  const [draftSales, setDraftSales] = useState([]);
  const [recentTotal, setRecentTotal] = useState(0);
  const [draftTotal, setDraftTotal] = useState(0);
  const [recentDateMode, setRecentDateMode] = useState("single");
  const [recentDate, setRecentDate] = useState(today());
  const [recentDateFrom, setRecentDateFrom] = useState(today());
  const [recentDateTo, setRecentDateTo] = useState(today());
  const [recentSearch, setRecentSearch] = useState("");
  const suggestions = useMemo(() => {
    const q = query.toLowerCase();
    return data.batches.filter((batch) => {
      const product = data.products.find((p) => p.id === batch.product_id);
      return Number(batch.stock_remaining || 0) > 0 && (!q || product?.name?.toLowerCase().includes(q) || product?.barcode?.toLowerCase().includes(q) || batch.batch_no?.toLowerCase().includes(q) || batch.barcode?.toLowerCase().includes(q));
    }).slice(0, 8);
  }, [data, query]);
  const grossAmount = saleItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const payable = saleItems.reduce((sum, item) => sum + Number(item.payable_amount ?? item.amount ?? 0), 0);
  const lineDiscount = Math.max(0, grossAmount - payable);
  const checkoutDiscount = Number(checkoutDiscountAmount || 0);
  const totalDiscount = roundMoney(lineDiscount + checkoutDiscount);
  const totalDiscountPercent = grossAmount ? roundPercent((totalDiscount / grossAmount) * 100) : 0;
  const checkoutPayable = Math.max(0, payable - checkoutDiscount);
  const checkoutReceived = Number(receiveNow || 0);
  const duePayment = 0;
  const returnedCash = Math.max(0, checkoutReceived - checkoutPayable);
  const canGenerateInvoice = receiveNow !== "";
  const loadSaleList = useCallback(async () => {
    const params = new URLSearchParams({
      skip: String((saleListPage - 1) * saleListPageSize),
      limit: String(saleListPageSize),
    });
    if (saleTab === "recent") {
      params.set("paged", "true");
      if (recentDateMode === "single") {
        params.set("date_from", recentDate);
        params.set("date_to", recentDate);
      } else {
        params.set("date_from", recentDateFrom);
        params.set("date_to", recentDateTo);
      }
      if (recentSearch.trim()) params.set("q", recentSearch.trim());
      const result = await apiCall(`/api/sales?${params.toString()}`);
      const rows = result.items || result;
      setRecentSales(rows);
      setRecentTotal(result.total ?? rows.length);
    }
    if (saleTab === "draft") {
      params.set("paged", "true");
      const result = await apiCall(`/api/draft-sales?${params.toString()}`);
      const rows = result.items || result;
      setDraftSales(rows);
      setDraftTotal(result.total ?? rows.length);
    }
  }, [apiCall, saleListPage, saleListPageSize, saleTab, recentDateMode, recentDate, recentDateFrom, recentDateTo, recentSearch]);
  useEffect(() => {
    if (saleTab === "new") return;
    const timer = setTimeout(() => {
      loadSaleList().catch((error) => onError(error));
    }, 150);
    return () => clearTimeout(timer);
  }, [loadSaleList, onError, saleTab]);

  function selectBatch(batch) {
    const product = data.products.find((p) => p.id === batch.product_id);
    setSelectedBatch(batch);
    setQuery(product?.name || "");
    setBarcode(batch.barcode || product?.barcode || "");
    setShowSuggestions(false);
  }

  function changeBarcode(value) {
    setBarcode(value);
    const q = value.trim().toLowerCase();
    if (!q) {
      setSelectedBatch(null);
      return;
    }
    setSelectedBatch(null);
    const directBatchMatch = data.batches.find((batch) => Number(batch.stock_remaining || 0) > 0 && batch.barcode && String(batch.barcode).toLowerCase() === q);
    const productMatch = data.products.find((product) => product.barcode && String(product.barcode).toLowerCase() === q);
    const productBatchMatch = productMatch ? data.batches.find((batch) => Number(batch.product_id) === Number(productMatch.id) && Number(batch.stock_remaining || 0) > 0 && batch.status !== "reported") : null;
    const match = directBatchMatch || productBatchMatch;
    if (match) selectBatch(match);
  }

  function calculateItem(base, discountSource = "auto") {
    const pricingQty = Number(base.pricing_qty ?? base.total_qty ?? 0);
    const amount = pricingQty * Number(base.rate || 0);
    let discountPercent = base.discount_percent ?? "";
    let discountAmount = base.discount_amount ?? "";
    if (discountSource === "percent") {
      discountAmount = discountPercent === "" ? "" : roundMoney(amount * (Number(discountPercent || 0) / 100));
    } else if (discountSource === "amount") {
      discountPercent = discountAmount === "" ? "" : roundPercent(amount ? (Number(discountAmount || 0) / amount) * 100 : 0);
    } else if (discountPercent !== "" && discountPercent != null) {
      discountAmount = roundMoney(amount * (Number(discountPercent || 0) / 100));
    } else if (discountAmount !== "" && discountAmount != null) {
      discountPercent = roundPercent(amount ? (Number(discountAmount || 0) / amount) * 100 : 0);
    }
    const cashDiscount = Number(discountAmount || 0);
    return {
      ...base,
      pricing_qty: pricingQty,
      amount,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      payable_amount: Math.max(0, amount - cashDiscount),
    };
  }

  function addItem() {
    const batch = selectedBatch;
    if (!batch || !String(qty || "").trim()) {
      setNotice?.("");
      setValidationMessage("Please complete all fields");
      return;
    }
    const product = data.products.find((p) => p.id === batch.product_id);
    const quantity = Number(qty || 1);
    if (quantity <= 0) {
      onError(new Error("Enter a valid quantity."));
      return;
    }
    const unitsPerBox = Number(batch.units_per_box || 0);
    const boxUnitMultiplier = unitsPerBox || 1;
    const totalQty = saleType === "Box" ? quantity * boxUnitMultiplier : quantity;
    if (totalQty > Number(batch.stock_remaining || 0)) {
      onError(new Error(`Only ${formatCompactNumber(batch.stock_remaining)} units are available in this batch.`));
      return;
    }
    const unitRate = Number(batch.sell_price || 0);
    const boxRate = Number(batch.boxes_price || unitRate * boxUnitMultiplier || unitRate);
    setSaleItems([...saleItems, calculateItem({
      batch_id: batch.id,
      product_id: batch.product_id,
      product_name: product?.name || "-",
      batch_no: batch.batch_no,
      qt_in_box: saleType === "Box" ? quantity : unitsPerBox ? Number((quantity / unitsPerBox).toFixed(2)) : 0,
      qt_in_units: saleType === "Box" ? 0 : quantity,
      total_qty: totalQty,
      pricing_qty: saleType === "Box" ? quantity : totalQty,
      cost_price: Number(batch.cost_price || 0),
      rate: saleType === "Box" ? boxRate : unitRate,
      discount_percent: "",
      discount_amount: "",
    })]);
    setQuery("");
    setBarcode("");
    setNotice?.("");
    setShowSuggestions(false);
    setSelectedBatch(null);
    setSaleType("Unit");
    setQty("");
  }

  function updateSaleItem(index, patch, discountSource) {
    setSaleItems((items) => items.map((item, itemIndex) => itemIndex === index ? calculateItem({ ...item, ...patch }, discountSource) : item));
  }

  function updateCheckoutDiscountPercent(value) {
    setCheckoutDiscountPercent(value);
    setCheckoutDiscountAmount(value === "" ? "" : roundMoney(payable * (Number(value || 0) / 100)));
  }

  function updateCheckoutDiscountAmount(value) {
    setCheckoutDiscountAmount(value);
    setCheckoutDiscountPercent(value === "" ? "" : roundPercent(payable ? (Number(value || 0) / payable) * 100 : 0));
  }

  function openCheckout() {
    if (!saleItems.length) return;
    setReceiveNow("");
    setCheckoutOpen(true);
  }

  function salePayload(overrides = {}) {
    const totalAmount = Number(overrides.totalAmount ?? grossAmount);
    const discountAmount = Number(overrides.discountAmount ?? 0);
    const discountPercent = overrides.discountPercent ?? null;
    const totalPayable = Number(overrides.totalPayable ?? Math.max(0, totalAmount - discountAmount));
    const amountPaid = Number(overrides.paidAmount ?? paid ?? 0);
    return {
      customer_name: overrides.customerName ?? customer.name ?? "Walk-in",
      customer_phone: overrides.customerPhone ?? customer.phone ?? null,
      doctor_name: doctorName.trim() || null,
      date: overrides.date ?? today(),
      time: overrides.time ?? nowTime(),
      total_amount: totalAmount,
      discount_percent: discountPercent === "" ? null : discountPercent,
      discount_amount: discountAmount || null,
      total_payable: totalPayable,
      paid: amountPaid,
      due: Math.max(0, totalPayable - amountPaid),
      change_returned: Math.max(0, amountPaid - totalPayable),
      payment_method: overrides.paymentMethod ?? paymentMethod,
      items: saleItems.map((item) => ({
        product_id: item.product_id,
        batch_id: item.batch_id,
        qt_in_box: Number(item.qt_in_box || 0),
        qt_in_units: Number(item.qt_in_units || 0),
        total_qty: Number(item.total_qty || 0),
        cost_price: Number(item.cost_price || 0),
        rate: Number(item.rate || 0),
        amount: Number(item.amount || 0),
        discount_percent: item.discount_percent === "" ? null : Number(item.discount_percent || 0),
        discount_amount: item.discount_amount === "" ? null : Number(item.discount_amount || 0),
      })),
    };
  }

  async function generateInvoice() {
    if (!saleItems.length) return;
    try {
      const endpoint = currentDraftId ? `/api/draft-sales/${currentDraftId}/checkout` : editingSaleId ? `/api/sales/${editingSaleId}` : "/api/sales";
      const method = editingSaleId && !currentDraftId ? "PUT" : "POST";
      const createdSale = await apiCall(endpoint, {
        method,
        body: JSON.stringify(salePayload({
          totalAmount: grossAmount,
          discountAmount: totalDiscount,
          discountPercent: totalDiscount ? totalDiscountPercent : null,
          totalPayable: checkoutPayable,
          paidAmount: checkoutReceived,
          paymentMethod,
          date: editingSaleSnapshot?.date,
          time: editingSaleSnapshot?.time,
        })),
      });
      setCurrentDraftId(null);
      setEditingSaleId(null);
      setEditingSaleSnapshot(null);
      setSaleItems([]);
      setPaid("");
      setDoctorName("");
      setCheckoutOpen(false);
      setCheckoutDiscountAmount("");
      setCheckoutDiscountPercent("");
      setReceiveNow("");
      await reload();
      setInvoiceSale(createdSale);
    } catch (error) {
      onError(error);
    }
  }

  async function saveDraft(payloadOverrides = {}) {
    if (!saleItems.length) return;
    if (editingSaleId) {
      onError(new Error("Existing sales must be checked out after editing."));
      return;
    }
    try {
      await apiCall(currentDraftId ? `/api/draft-sales/${currentDraftId}` : "/api/draft-sales", {
        method: currentDraftId ? "PUT" : "POST",
        body: JSON.stringify(salePayload(payloadOverrides)),
      });
      setCurrentDraftId(null);
      setEditingSaleId(null);
      setEditingSaleSnapshot(null);
      setSaleItems([]);
      setPaid("");
      setCheckoutOpen(false);
      setSaleTab("draft");
      setSaleListPage(1);
      setSaleListPageSize(10);
      await reload();
    } catch (error) {
      onError(error);
    }
  }

  function loadSaleItems(sale) {
    setSaleItems((sale.items || []).map((item) => ({
      batch_id: item.batch_id,
      product_id: item.product_id,
      product_name: item.product_name,
      batch_no: item.batch_no,
      reference_qt_in_box_display: item.reference_qt_in_box_display || "",
      qt_in_box: Number(item.qt_in_box || 0),
      qt_in_units: Number(item.qt_in_units || item.total_qty || 0),
      total_qty: Number(item.total_qty || 0),
      pricing_qty: Number(item.qt_in_box || 0) > 0 && Number(item.qt_in_units || 0) === 0 ? Number(item.qt_in_box || 0) : Number(item.total_qty || 0),
      cost_price: Number(item.cost_price || 0),
      rate: Number(item.rate || 0),
      amount: Number(item.amount || item.payable_amount || 0),
      payable_amount: Number(item.payable_amount || item.amount || 0),
      discount_percent: item.discount_percent || "",
      discount_amount: item.discount_amount || "",
    })));
  }

  function resumeSale(sale) {
    loadSaleItems(sale);
    setPaid(sale.paid || "");
    setDoctorName(sale.doctor_name || "");
    setCustomer({ name: sale.customer_name || "Walk-in", phone: sale.customer_phone || "" });
    setCheckoutDiscountAmount(sale.discount_amount || "");
    setCheckoutDiscountPercent(sale.discount_percent || "");
    setReceiveNow(sale.paid || "");
    setCurrentDraftId(sale.id);
    setEditingSaleId(null);
    setEditingSaleSnapshot(null);
    setSaleTab("draft");
  }

  function editExistingSale(sale) {
    loadSaleItems(sale);
    setPaid(sale.paid || "");
    setDoctorName(sale.doctor_name || "");
    setCustomer({ name: sale.customer_name || "Walk-in", phone: sale.customer_phone || "" });
    setCheckoutDiscountAmount(sale.discount_amount || "");
    setCheckoutDiscountPercent(sale.discount_percent || "");
    setReceiveNow(sale.paid || "");
    setCurrentDraftId(null);
    setEditingSaleId(sale.id);
    setEditingSaleSnapshot({ date: sale.date, time: sale.time });
  }

  async function discardDraft(sale) {
    if (!window.confirm(`Discard draft ${sale.invoice_number}?`)) return;
    try {
      await apiCall(`/api/draft-sales/${sale.id}`, { method: "DELETE" });
      if (currentDraftId === sale.id) setCurrentDraftId(null);
      await reload();
      await loadSaleList();
    } catch (error) {
      onError(error);
    }
  }

  function printSale(sale) {
    setInvoiceSale(sale);
  }

  function renderSaleEditor({ inline = false, showCost = !inline } = {}) {
    const tableColSpan = showCost ? 12 : 11;
    return (
      <>
        {!inline && editingSaleId ? <div className="edit-sale-notice">Editing existing invoice. Checkout will update this sale.</div> : null}
        <table className="entry-table">
          <thead><tr><th>Product Name</th><th>Bar Code</th><th>Sale Type</th><th>Quantity</th><th>Action</th></tr></thead>
          <tbody><tr>
            <td className="suggest-cell">
              <input placeholder="Enter Product Name" value={query} onFocus={() => setShowSuggestions(Boolean(query))} onChange={(event) => { setQuery(event.target.value); setSelectedBatch(null); setBarcode(""); setShowSuggestions(Boolean(event.target.value)); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 120)} />
              {showSuggestions && query ? <div className="suggestions">{suggestions.length ? suggestions.map((batch) => {
                const product = data.products.find((p) => p.id === batch.product_id);
                return <button type="button" key={batch.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectBatch(batch)}>{product?.name}<span>Batch {batch.batch_no} - Stock {batch.stock_remaining}</span></button>;
              }) : <div className="empty-small">No products found</div>}</div> : null}
            </td>
            <td><input placeholder="Enter Barcode" value={barcode} onChange={(event) => changeBarcode(event.target.value)} /></td>
            <td>
              <TextOptionPicker
                className="sale-type-picker"
                ariaLabel="Sale Type"
                placeholder="Select Sale Type"
                value={saleType}
                options={[{ value: "Unit", label: "Unit" }, { value: "Box", label: "Box" }]}
                onChange={setSaleType}
              />
            </td>
            <td><input type="number" min="1" placeholder="Enter quantity" value={qty} onChange={(event) => setQty(event.target.value)} /></td>
            <td><button className="primary" onClick={addItem}>Add to List</button></td>
          </tr></tbody>
        </table>
        <section className={`panel sale-items-panel${inline ? " inline-sale-editor" : ""}`}>
          <div className="sale-items-title">{inline ? "Sales Items List" : "Purchased Items List"}</div>
          {inline && editingSaleSnapshot?.date ? <div className="sale-edit-date">{formatDisplayDate(editingSaleSnapshot.date)}</div> : null}
          <table className="data-table sale-items-table"><thead><tr><th>Product Name</th><th>Batch no.</th><th>Qt in Box</th><th>Qt in Units</th><th>Total Quantity</th>{showCost ? <th>Cost Price</th> : null}<th>Rate/Sell Price</th><th>Amount</th><th>Discount(%)</th><th>Discount(Amt)</th><th>Payable Amt</th><th>Actions</th></tr></thead>
            <tbody>{saleItems.length ? saleItems.map((item, index) => <tr key={`${item.batch_id}-${index}`}>
              <td>{item.product_name}</td>
              <td>{item.batch_no}</td>
              <td>{item.reference_qt_in_box_display || formatCompactNumber(item.qt_in_box)}</td>
              <td>{formatCompactNumber(item.qt_in_units)}</td>
              <td>{formatCompactNumber(item.total_qty)}</td>
              {showCost ? <td>{plainMoney(item.cost_price)}</td> : null}
              <td><input className="table-input" type="number" min="0" value={item.rate} onChange={(event) => updateSaleItem(index, { rate: event.target.value })} /></td>
              <td>{plainMoney(item.amount)}</td>
              <td><input className="table-input" type="number" min="0" placeholder="Disc(%)" value={item.discount_percent} onChange={(event) => updateSaleItem(index, { discount_percent: event.target.value }, "percent")} /></td>
              <td><input className="table-input" type="number" min="0" placeholder="Disc Amt" value={item.discount_amount} onChange={(event) => updateSaleItem(index, { discount_amount: event.target.value }, "amount")} /></td>
              <td>{plainMoney(item.payable_amount)}</td>
              <td><div className="icon-actions"><button className="icon-action" type="button" title="Edit"><Pencil size={18} /></button><button className="icon-action danger-icon" type="button" title="Delete" onClick={() => setSaleItems(saleItems.filter((_, i) => i !== index))}><Trash2 size={18} /></button></div></td>
            </tr>) : <tr><td colSpan={tableColSpan} className="empty">No Data Found</td></tr>}</tbody></table>
          {saleItems.length ? <>
            <div className="sale-total"><span>Payable Amt.</span><strong>Rs. {plainMoney(payable)}</strong></div>
            <div className="sale-actions">{!editingSaleId ? <button className="outline" onClick={() => saveDraft()}>Save as a Draft</button> : null}<button className="primary" onClick={openCheckout}>Proceed to Checkout</button></div>
          </> : null}
        </section>
      </>
    );
  }

  if (checkoutOpen) {
    const draftOverrides = {
      totalAmount: grossAmount,
      discountAmount: totalDiscount,
      discountPercent: totalDiscount ? totalDiscountPercent : null,
      totalPayable: checkoutPayable,
      paidAmount: checkoutReceived,
      paymentMethod,
    };
    return (
      <section className="checkout-page">
        <button className="back-button" type="button" onClick={() => setCheckoutOpen(false)}>&lsaquo; Back</button>
        <label className="doctor-field">
          <span>Doctor Name(Optional)</span>
          <input value={doctorName} placeholder="Doctor Name" onChange={(event) => setDoctorName(event.target.value)} />
        </label>
        <div className="checkout-heading">
          <h2>Payments &amp; Receivables</h2>
          <button className="customer-toggle" type="button" onClick={() => setShowCustomer((value) => !value)}><Plus size={20} /> Add Customer Details</button>
        </div>
        {showCustomer ? <div className="customer-details">
          <input placeholder="Customer Name" value={customer.name === "Walk-in" ? "" : customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value || "Walk-in" }))} />
          <input placeholder="Phone" value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} />
        </div> : null}
        <section className="payments-box">
          <div className="payment-left">
            <strong className="total-amount">Total Amount: RS. {money(payable)}</strong>
            <div className="checkout-discount">
              <span>Add Discount</span>
              <input type="number" min="0" placeholder="RS." value={checkoutDiscountAmount} onChange={(event) => updateCheckoutDiscountAmount(event.target.value)} />
              <div className="percent-input"><input type="number" min="0" placeholder="0" value={checkoutDiscountPercent} onChange={(event) => updateCheckoutDiscountPercent(event.target.value)} /><span>%</span></div>
            </div>
            <div className="payment-methods">
              <span>Select Payment Method</span>
              <label><input type="radio" name="payment-method" checked={paymentMethod === "card_payment"} onChange={() => setPaymentMethod("card_payment")} /><b>VISA</b></label>
              <label><input type="radio" name="payment-method" checked={paymentMethod === "easy_paisa"} onChange={() => setPaymentMethod("easy_paisa")} /><b>e</b></label>
              <label><input type="radio" name="payment-method" checked={paymentMethod === "jazz_cash"} onChange={() => setPaymentMethod("jazz_cash")} /><b>JazzCash</b></label>
              <label><input type="radio" name="payment-method" checked={paymentMethod === "bank_transfer"} onChange={() => setPaymentMethod("bank_transfer")} /><b>Card</b></label>
              <label><input type="radio" name="payment-method" checked={paymentMethod === "cash"} onChange={() => setPaymentMethod("cash")} /><b className="cash-icon">Cash</b></label>
            </div>
          </div>
          <div className="payment-right">
            <div className="due-payment"><span>Due Payment</span><strong>RS. {money(duePayment)}</strong></div>
            <div className="payable-line"><span>Payable Amount</span><strong>RS. {money(checkoutPayable)}</strong></div>
            <label className="receive-now"><span>Receive Now:</span><input type="number" min="0" placeholder="Payment" value={receiveNow} onChange={(event) => setReceiveNow(event.target.value)} /></label>
            <div className="returned-cash"><strong>Returned Cash:</strong> RS. {money(returnedCash)}</div>
          </div>
        </section>
        <div className="checkout-actions">
          {!editingSaleId ? <button className="outline draft-outline" type="button" onClick={() => saveDraft(draftOverrides)}>Save as a Draft</button> : null}
          <button className="primary" type="button" disabled={!canGenerateInvoice} onClick={generateInvoice}>Generate Invoice</button>
        </div>
      </section>
    );
  }

  return (
    <>
    <section className="sale-page">
      <div className="tabs">
        <label><input type="radio" name="sale-tab" value="new" checked={saleTab === "new"} onChange={() => { setNotice?.(""); setSaleTab("new"); setSaleListPage(1); }} /> New Sales</label>
        <label><input type="radio" name="sale-tab" value="recent" checked={saleTab === "recent"} onChange={() => { setNotice?.(""); setSaleTab("recent"); setSaleListPage(1); setSaleListPageSize(10); }} /> Recent Sales</label>
        <label><input type="radio" name="sale-tab" value="draft" checked={saleTab === "draft"} onChange={() => { setNotice?.(""); setSaleTab("draft"); setSaleListPage(1); setSaleListPageSize(10); }} /> Draft Sales</label>
      </div>
      {saleTab === "new" ? renderSaleEditor() : saleTab === "recent" ? (
        <RecentSalesList
          sales={recentSales}
          page={saleListPage}
          pageSize={saleListPageSize}
          totalRows={recentTotal}
          dateMode={recentDateMode}
          date={recentDate}
          dateFrom={recentDateFrom}
          dateTo={recentDateTo}
          search={recentSearch}
          onDateModeChange={(value) => { setRecentDateMode(value); setSaleListPage(1); }}
          onDateChange={(value) => { setRecentDate(value); setSaleListPage(1); }}
          onDateFromChange={(value) => { setRecentDateFrom(value); setSaleListPage(1); }}
          onDateToChange={(value) => { setRecentDateTo(value); setSaleListPage(1); }}
          onSearchChange={(value) => { setRecentSearch(value); setSaleListPage(1); }}
          onPageChange={setSaleListPage}
          onPageSizeChange={(value) => { setSaleListPageSize(value); setSaleListPage(1); }}
          onEdit={editExistingSale}
          onPrint={printSale}
          expandedSaleId={editingSaleId}
          renderExpandedEditor={() => renderSaleEditor({ inline: true })}
        />
      ) : (
        <DraftSalesList
          sales={draftSales}
          page={saleListPage}
          pageSize={saleListPageSize}
          totalRows={draftTotal}
          onPageChange={setSaleListPage}
          onPageSizeChange={(value) => { setSaleListPageSize(value); setSaleListPage(1); }}
          onResume={resumeSale}
          onDiscard={discardDraft}
          expandedSaleId={currentDraftId}
          renderExpandedEditor={() => renderSaleEditor({ inline: true, showCost: true })}
        />
      )}
    </section>
    {validationMessage ? <ValidationModal message={validationMessage} close={() => setValidationMessage("")} /> : null}
    {invoiceSale ? <InvoiceModal sale={invoiceSale} data={data} close={() => setInvoiceSale(null)} /> : null}
    </>
  );
}

function ValidationModal({ message, close }) {
  return (
    <div className="modal-backdrop validation-backdrop">
      <section className="simple-modal validation-modal">
        <div className="validation-modal-body">
          <p>{message}</p>
          <button className="primary" type="button" onClick={close}>Ok</button>
        </div>
      </section>
    </div>
  );
}

function SaleActionIcons({ children }) {
  return <div className="icon-actions">{children}</div>;
}

function saleItemCount(sale) {
  return (sale.items || []).length;
}

function saleDisplayId(sale) {
  return String(sale.invoice_number || sale.id || "").replace(/^DRAFT-/, "");
}

function draftTotalAmount(value) {
  const numeric = Number(value || 0);
  return Number.isInteger(numeric) ? String(numeric) : fixedMoney(numeric);
}

function RecentSalesList({ sales, page, pageSize, totalRows, dateMode, date, dateFrom, dateTo, search, onDateModeChange, onDateChange, onDateFromChange, onDateToChange, onSearchChange, onPageChange, onPageSizeChange, onEdit, onPrint, expandedSaleId, renderExpandedEditor }) {
  return (
    <section className="sale-list-view">
      <div className="recent-sale-filters">
        <div className="tabs compact-tabs">
          <label><input type="radio" name="recent-date-mode" value="single" checked={dateMode === "single"} onChange={() => onDateModeChange("single")} /> Select Date</label>
          <label><input type="radio" name="recent-date-mode" value="range" checked={dateMode === "range"} onChange={() => onDateModeChange("range")} /> Select Date Range</label>
        </div>
        {dateMode === "single" ? (
          <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        ) : (
          <div className="date-range-fields">
            <input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
            <input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
          </div>
        )}
        <label className="search-field compact-search"><Search size={16} /><input placeholder="Search..." value={search} onChange={(event) => onSearchChange(event.target.value)} /></label>
      </div>
      {sales.length ? <>
        <div className="table-scroll">
          <table className="data-table wide">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Date</th>
                <th>Time</th>
                <th>Total Amount(RS.)</th>
                <th>Discount(%)</th>
                <th>Discount Amount</th>
                <th>Total Payable</th>
                <th>Paid</th>
                <th>Due(s)</th>
                <th>Returned</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
              <Fragment key={sale.id}>
                <tr>
                  <td>{sale.invoice_number}</td>
                  <td>{sale.date}</td>
                  <td>{formatTimeDisplay(sale.time)}</td>
                  <td>{money(sale.total_amount)}</td>
                  <td>{money(sale.discount_percent || 0)}</td>
                  <td>{money(sale.discount_amount || 0)}</td>
                  <td>{money(sale.total_payable)}</td>
                  <td>{money(sale.paid)}</td>
                  <td>{money(sale.due)}</td>
                  <td>{money(sale.change_returned || 0)}</td>
                  <td>
                    <SaleActionIcons>
                      <button className="icon-action" type="button" title="edit" aria-label="edit" onClick={() => onEdit(sale)}><Pencil size={18} /></button>
                      <button className="icon-action" type="button" title="view" aria-label="view" onClick={() => onPrint(sale)}><Printer size={18} /></button>
                    </SaleActionIcons>
                  </td>
                </tr>
                {expandedSaleId === sale.id ? <tr className="recent-edit-row"><td colSpan="11">{renderExpandedEditor?.()}</td></tr> : null}
              </Fragment>
            ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter page={page} pageSize={pageSize} pageSizeOptions={[10, 50]} rowCount={totalRows} currentCount={sales.length} totalKnown onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
      </> : <p className="report-empty">No sales found for selected date.</p>}
    </section>
  );
}

function DraftSalesList({ sales, page, pageSize, totalRows, onPageChange, onPageSizeChange, onResume, onDiscard, expandedSaleId, renderExpandedEditor }) {
  return (
    <section className="sale-list-view">
      <div className="table-scroll">
      <table className="data-table wide">
        <thead>
          <tr>
            <th>Draft ID</th>
            <th>Date</th>
            <th>Total Items</th>
            <th>Total Amount</th>
            <th>Discount(%)</th>
            <th>Discount Amt</th>
            <th>Total Payable</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sales.length ? sales.map((sale) => (
            <Fragment key={sale.id}>
              <tr>
                <td>{saleDisplayId(sale)}</td>
                <td>{sale.date}</td>
                <td>{formatCompactNumber(saleItemCount(sale))}</td>
                <td>{draftTotalAmount(sale.total_amount)}</td>
                <td>{plainMoney(sale.discount_percent || 0)}</td>
                <td>{plainMoney(sale.discount_amount || 0)}</td>
                <td>{plainMoney(sale.total_payable)}</td>
                <td>
                  <SaleActionIcons>
                    <button className="icon-action" type="button" title="edit" aria-label="edit" onClick={() => onResume(sale)}><Pencil size={18} /></button>
                    <button className="icon-action danger-icon" type="button" title="Delete" aria-label="Delete" onClick={() => onDiscard(sale)}><Trash2 size={18} /></button>
                  </SaleActionIcons>
                </td>
              </tr>
              {expandedSaleId === sale.id ? <tr className="recent-edit-row"><td colSpan="8">{renderExpandedEditor?.()}</td></tr> : null}
            </Fragment>
          )) : <tr><td colSpan="8" className="empty">No Data Found</td></tr>}
        </tbody>
      </table>
      </div>
      <PaginationFooter page={page} pageSize={pageSize} pageSizeOptions={[10, 50]} rowCount={totalRows ?? sales.length} currentCount={sales.length} totalKnown={totalRows != null} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
    </section>
  );
}

function InvoiceModal({ sale, data, close }) {
  const items = sale.items || [];
  const policy = data.returnPolicies?.[0]?.description || "Please check and verify your medicines. Medicines will be returned within 15 days. Fridge items are non returnable";
  const totals = invoiceReceiptTotals(sale);
  const showPaymentRows = sale.reference_original_due_display !== "";
  return (
    <div className="modal-backdrop invoice-backdrop">
      <section className="invoice-modal">
        <div className="invoice-head">
          <h2>Invoice Details</h2>
          <button type="button" onClick={close}><X /></button>
        </div>
        <div className="receipt-card" id="invoice-receipt">
          <h3>Hassan Pharmacy</h3>
          <p>Pharmacy Management System</p>
          <p>DHA phase 2 extension</p>
          <p>Phone # 03324122333</p>
          <p>License No. 1</p>
          <div className="receipt-meta">
            {sale.customer_name ? <span>C.Name: {sale.customer_name}</span> : null}
            {sale.customer_phone ? <span>C.Ph #: {sale.customer_phone}</span> : null}
            <span>Inv. No: {sale.invoice_number}</span>
            <span>C. By: Admin</span>
            <span>{formatInvoiceDate(sale)}</span>
          </div>
          <table>
            <thead><tr><th>Item(s)</th><th>QTY</th><th>Price</th><th>Amt</th></tr></thead>
            <tbody>{items.length ? items.map((item, index) => (
              <tr key={item.id || index}>
                <td>{receiptProductName(item, data)}</td>
                <td>{money(item.total_qty)}</td>
                <td>{money(item.rate)}</td>
                <td>{money(item.payable_amount ?? item.amount)}</td>
              </tr>
            )) : <tr><td colSpan="4">No items found</td></tr>}</tbody>
          </table>
          <div className="receipt-total-row"><span>Total Items: {items.length}</span></div>
          <div className="receipt-total-row"><span>Gross Total:</span><strong>Rs. {money(totals.gross)}</strong></div>
          <div className="receipt-total-row"><span>Discount:</span><strong>Rs. {money(totals.discount)}</strong></div>
          <div className="receipt-total-row"><span>Net Total:</span><strong>Rs. {money(totals.net)}</strong></div>
          {showPaymentRows ? <>
            <div className="receipt-total-row"><span>Payment Received:</span><strong>Rs. {money(totals.paid)}</strong></div>
            <div className="receipt-total-row"><span>Due Payment:</span><strong>Rs. {money(totals.due)}</strong></div>
          </> : null}
          <p className="receipt-policy">{policy}</p>
          <p className="receipt-footer">Software By Hassan Pharmacy, Phone# 03324122333</p>
        </div>
        <div className="invoice-modal-actions">
          <button className="primary" type="button" onClick={() => printInvoiceReceipt(sale, policy, data)}>Print Invoice</button>
        </div>
      </section>
    </div>
  );
}

function ReturnInvoiceModal({ detail, close }) {
  const sale = detail.sale || {};
  const returns = detail.returns || [];
  const invoiceNumber = returns[0]?.return_invoice_number || "Return Invoice";
  const total = returns.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return (
    <div className="modal-backdrop invoice-backdrop">
      <section className="invoice-modal">
        <div className="invoice-head">
          <h2>Return Invoice Details</h2>
          <button type="button" onClick={close}><X /></button>
        </div>
        <div className="receipt-card" id="return-receipt">
          <h3>Hassan Pharmacy</h3>
          <p>Pharmacy Management System</p>
          <p>Phone # 03324122333</p>
          <p>License No. 1</p>
          <div className="receipt-meta">
            <span>Return Inv. No: {invoiceNumber}</span>
            <span>Original Inv. No: {sale.invoice_number}</span>
            <span>{formatInvoiceDate(sale)}</span>
          </div>
          <table>
            <thead><tr><th>Item(s)</th><th>Returned</th><th>Rate</th><th>Amt</th></tr></thead>
            <tbody>{returns.length ? returns.map((row, index) => (
              <tr key={row.id || index}>
                <td>{row.product_name}</td>
                <td>{formatCompactNumber(row.qty_returned)}</td>
                <td>{money(row.rate)}</td>
                <td>{money(row.amount)}</td>
              </tr>
            )) : <tr><td colSpan="4">No return items found</td></tr>}</tbody>
          </table>
          <div className="receipt-total-row"><span>Total Items: {returns.length}</span></div>
          <div className="receipt-total-row"><span>Total Return:</span><strong>Rs. {money(total)}</strong></div>
          <p className="receipt-footer">Software By Hassan Pharmacy, Phone# 03324122333</p>
        </div>
        <div className="invoice-modal-actions">
          <button className="primary" type="button" onClick={() => printReturnReceipt(detail)}>Print Return Invoice</button>
        </div>
      </section>
    </div>
  );
}

function SalesHistoryDetailsModal({ sale, data, close }) {
  const items = sale.items || [];
  const hasReferenceReturn = sale.reference_return_amount != null;
  const showReturnDiscountPercent = sale.reference_return_discount_percent_visible !== false;
  return (
    <div className="modal-backdrop invoice-backdrop">
      <section className="history-detail-modal">
        <div className="invoice-head">
          <h2>Sales History Details</h2>
          <button type="button" onClick={close}><X /></button>
        </div>
        <div className="history-detail-body">
          <h3>Invoice Number : {sale.invoice_number}</h3>
          <h4>Sales Invoice</h4>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Time</th><th>Total Amount</th><th>Discount Amount</th><th>Total Payable</th><th>Paid</th><th>Due(s)</th><th>Change Returned</th></tr></thead>
            <tbody><tr>
              <td>{sale.date}</td>
              <td>{formatHistoryTime(sale.time)}</td>
              <td>{formatHistoryCompactAmount(sale.reference_original_total_amount ?? sale.total_amount)}</td>
              <td>{formatHistoryCompactAmount(sale.reference_original_discount_amount ?? sale.discount_amount)}</td>
              <td>{formatHistoryCompactAmount(sale.reference_original_total_payable ?? sale.total_payable)}</td>
              <td>{formatHistoryCompactAmount(sale.reference_original_paid ?? sale.paid)}</td>
              <td>{sale.reference_original_due_display != null ? sale.reference_original_due_display : formatHistoryCompactAmount(sale.reference_original_due ?? sale.due)}</td>
              <td>{formatHistoryCompactAmount(sale.reference_original_change_returned ?? sale.change_returned)}</td>
            </tr></tbody>
          </table>
          {hasReferenceReturn ? <>
            <h4>Return Invoice</h4>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Returned Amount</th>{showReturnDiscountPercent ? <th>Returned Discount Amt(%)</th> : null}<th>Returned Discount Amt(RS)</th></tr></thead>
              <tbody><tr>
                <td>{sale.date}</td>
                <td>{formatHistoryFixedAmount(sale.reference_return_amount)}</td>
                {showReturnDiscountPercent ? <td>{formatHistoryFixedAmount(sale.reference_return_discount_percent)}</td> : null}
                <td>{formatHistoryFixedAmount(sale.reference_return_discount_amount)}</td>
              </tr></tbody>
            </table>
            <h4>After Return Sales Invoice</h4>
            <table className="data-table">
              <thead><tr><th>Total Amount</th><th>Net Paid</th></tr></thead>
              <tbody><tr>
                <td>{formatHistoryFixedAmount(sale.reference_after_return_total_amount)}</td>
                <td>{formatHistoryFixedAmount(sale.reference_after_return_net_paid)}</td>
              </tr></tbody>
            </table>
          </> : null}
          <h4>Purchase Item List</h4>
          <table className="data-table">
            <thead><tr><th>Batch no.</th><th>Product Name</th><th>QTY Sold</th><th>QTY Returned</th><th>Rate/Sell Price</th><th>Amount</th></tr></thead>
            <tbody>{items.length ? items.map((item, index) => (
              <tr key={item.id || index}>
                <td>{item.batch_no}</td>
                <td>{item.product_name}</td>
                <td>{formatCompactNumber(item.total_qty)}</td>
                <td>{Number(item.qty_returned || 0) > 0 ? formatCompactNumber(item.qty_returned) : "-"}</td>
                <td>{formatHistoryCompactAmount(item.rate)}</td>
                <td>{money(item.payable_amount ?? item.amount)}</td>
              </tr>
            )) : <tr><td colSpan="6" className="empty">No Data Found</td></tr>}</tbody>
          </table>
        </div>
        <div className="history-detail-actions">
          <button className="outline" type="button" onClick={close}>Close</button>
        </div>
      </section>
    </div>
  );
}

function BatchPage({ data, initialAlertFilter = "", openModal, apiCall, reload, onError }) {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("active");
  const [dateMode, setDateMode] = useState("single");
  const [date, setDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateField, setDateField] = useState("created_at");
  const [stockFilter, setStockFilter] = useState("in_stock");
  const [filterAddedBy, setFilterAddedBy] = useState(false);
  const [filterUpdatedBy, setFilterUpdatedBy] = useState(false);
  const [alertFilter, setAlertFilter] = useState("");
  const [actorId, setActorId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState(() => data.batches.filter((batch) => batch.status !== "reported"));
  const [totalRows, setTotalRows] = useState(rows.length);
  const todayDate = today();
  const nearExpiryDate = addDays(todayDate, 180);
  const expiredCount = referenceBatchAlertCounts.expired;
  const nearExpiryCount = referenceBatchAlertCounts.nearExpiry;
  useEffect(() => {
    if (initialAlertFilter === "expired") {
      setAlertFilter("expired");
      setStatusTab("active");
      setDateMode("range");
      setDateField("expire_date");
      setDateFrom("");
      setDateTo(todayDate);
      setPage(1);
      return;
    }
    if (initialAlertFilter === "near") {
      setAlertFilter("near");
      setStatusTab("active");
      setDateMode("range");
      setDateField("expire_date");
      setDateFrom(todayDate);
      setDateTo(nearExpiryDate);
      setPage(1);
      return;
    }
    setAlertFilter("");
    setDateMode("single");
    setDateField("created_at");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, [initialAlertFilter, nearExpiryDate, todayDate]);
  useEffect(() => {
    const localRows = data.batches.filter((batch) => statusTab === "active" ? batch.status !== "reported" : batch.status === "reported");
    setRows(localRows);
    setTotalRows(localRows.length);
  }, [data.batches, statusTab]);
  useEffect(() => {
    const timer = setTimeout(async () => {
      const dataPageSize = pageSize;
      const params = new URLSearchParams({
        status: statusTab === "active" ? "active" : "reported",
        skip: String((page - 1) * dataPageSize),
        limit: String(dataPageSize),
        paged: "true",
        date_field: dateField,
      });
      if (dateMode === "range") {
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
      } else if (date) {
        params.set("date_from", date);
        params.set("date_to", date);
      }
      if (stockFilter) params.set("stock_filter", stockFilter);
      if (search.trim()) params.set("q", search.trim());
      if (actorId && filterAddedBy) params.set("added_by", actorId);
      if (actorId && filterUpdatedBy) params.set("updated_by", actorId);
      try {
        const pageData = unpackPaged(await apiCall(`/api/batches?${params.toString()}`));
        setRows(pageData.items);
        setTotalRows(pageData.total);
      } catch (error) {
        onError(error);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [apiCall, onError, statusTab, dateMode, date, dateFrom, dateTo, dateField, stockFilter, search, filterAddedBy, filterUpdatedBy, actorId, page, pageSize]);
  const columns = [
    ["batch_no", "Batch No."],
    ["shelf_name", "Shelf No."],
    ["product_name", "Name"],
    ["medicine_formula", "Medicine Formula"],
    ["stock_in", "Stock In"],
    ["stock_out", "Stock Out"],
    ["stock_remaining", "Stock Remaining"],
    ["purchase_price", "Stock Purchase Price"],
    ["purchase_price_before_tax", "Stock Purchase Price Before Tax"],
    ["sell_price", "Sell Price"],
    ["cost_price", "Cost Price"],
    ["total_cost", "Total Cost"],
    ["production_date", "Production Date"],
    ["expire_date", "Expire Date"],
    ["created_at", "Created at"],
    ["supplier_name", "Supplier Name"],
    ["paid_amount", "Paid Amount"],
    ["supplier_outstanding", "Supplier Outstanding"],
    ["supplier_invoice_no", "Supplier Invoice no."],
    ["actions", "Actions"],
  ];
  async function deleteBatch(row) {
    if (!window.confirm(`Report batch ${row.batch_no}?`)) return;
    try {
      await apiCall(`/api/batches/${row.id}`, { method: "DELETE" });
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  async function restoreBatch(row) {
    try {
      await apiCall(`/api/batches/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "active" }),
      });
      await reload();
      setStatusTab("active");
    } catch (error) {
      onError(error);
    }
  }
  function showExpired() {
    if (alertFilter === "expired") {
      setAlertFilter("");
      setDateMode("single");
      setDateField("created_at");
      setDateFrom("");
      setDateTo("");
      setPage(1);
      return;
    }
    setAlertFilter("expired");
    setStatusTab("active");
    setDateMode("range");
    setDateField("expire_date");
    setDateFrom("");
    setDateTo(todayDate);
    setPage(1);
  }
  function showNearExpiry() {
    if (alertFilter === "near") {
      setAlertFilter("");
      setDateMode("single");
      setDateField("created_at");
      setDateFrom("");
      setDateTo("");
      setPage(1);
      return;
    }
    setAlertFilter("near");
    setStatusTab("active");
    setDateMode("range");
    setDateField("expire_date");
    setDateFrom(todayDate);
    setDateTo(nearExpiryDate);
    setPage(1);
  }
  function formatBatchCell(row, key) {
    const moneyColumns = ["purchase_price", "purchase_price_before_tax", "total_cost", "paid_amount", "supplier_outstanding"];
    if (row.__summary) {
      if (key === "batch_no") return "Total";
      if (["stock_in", "stock_out", "stock_remaining"].includes(key)) return formatIndianInteger(row[key]);
      if (moneyColumns.includes(key)) return plainMoney(row[key]);
      return "-";
    }
    if (key === "batch_no") return row.reference_batch_no != null ? row.reference_batch_no : (row.batch_no || "-");
    if (key === "stock_in") return plainMoney(row[key]);
    if (key === "stock_remaining") return formatIndianInteger(row[key]);
    if (key === "medicine_formula") return formatMedicineFormula(row[key]);
    if (moneyColumns.includes(key)) return row[key] == null || row[key] === "" ? "-" : plainMoney(row[key]);
    if (key === "sell_price") return renderBatchPrice(row.reference_sell_price_display || formatCell(row[key]));
    if (key === "cost_price") return renderBatchPrice(row.reference_cost_price_display || formatCell(row[key]));
    if (key === "created_at") return formatTableDate(row.reference_created_at || row.created_at);
    if (["production_date", "expire_date"].includes(key)) return row[key] ? formatTableDate(row[key]) : "-";
    return formatCell(row[key]);
  }
  const batchSummaryRow = useMemo(() => makeBatchSummaryRow(rows), [rows]);
  const tableRows = useMemo(() => rows.length ? [...rows, batchSummaryRow] : rows, [rows, batchSummaryRow]);
  return (
    <section className="batch-page">
      <div className="batch-filters">
        <label><input type="radio" checked={statusTab === "active"} onChange={() => { setStatusTab("active"); setPage(1); }} /> Active</label>
        <label><input type="radio" checked={statusTab === "reported"} onChange={() => { setStatusTab("reported"); setPage(1); }} /> Reported</label>
        <label><input type="checkbox" checked={filterAddedBy} onChange={(event) => { setFilterAddedBy(event.target.checked); setPage(1); }} /> Added By</label>
        <label><input type="checkbox" checked={filterUpdatedBy} onChange={(event) => { setFilterUpdatedBy(event.target.checked); setPage(1); }} /> Updated By</label>
        <TextOptionPicker
          className="batch-filter-picker"
          ariaLabel="Batch actor"
          value={actorId}
          options={[{ value: "", label: "All" }, ...data.staff.map((user) => ({ value: user.id, label: user.name }))]}
          onChange={(value) => { setActorId(value); setPage(1); }}
        />
        <label><input type="radio" checked={dateMode === "single"} onChange={() => { setDateMode("single"); setPage(1); }} /> Date</label>
        <label><input type="radio" checked={dateMode === "range"} onChange={() => { setDateMode("range"); setPage(1); }} /> Date Range</label>
        <button className="primary" onClick={() => openModal(null)}>Add New Batch</button>
      </div>
      <div className="batch-alerts">
        <div className="batch-alert-messages">
          <span><span className="alert-icon danger">!</span>Some batch medicines are <strong>expired.</strong></span>
          <span><span className="alert-icon warning">!</span>Some batch medicines are <strong>near expiration.</strong></span>
        </div>
        <div className="batch-alert-filter">
          <label><input type="checkbox" checked={alertFilter === "expired"} onChange={showExpired} /> Expired Medicines ({expiredCount})</label>
          <label><input type="checkbox" checked={alertFilter === "near"} onChange={showNearExpiry} /> Near Expiry Medicines ({nearExpiryCount})</label>
        </div>
      </div>
      <div className="batch-toolbar">
        {dateMode === "range" ? <>
          <label><span className="field-title">From Date</span><input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>
          <label><span className="field-title">To Date</span><input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /></label>
        </> : <label><span className="field-title">Date</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} /></label>}
        <TextOptionPicker
          className="batch-toolbar-picker"
          ariaLabel="Batch date field"
          value={dateField}
          options={[
            { value: "created_at", label: "Created at" },
            { value: "expire_date", label: "Expire Date" },
            { value: "production_date", label: "Production Date" },
            { value: "purchase_date", label: "Purchase Date" },
          ]}
          onChange={(value) => { setDateField(value); setPage(1); }}
        />
        <label className="batch-stock-picker-label">
          <span className="field-title">Stock Status</span>
          <TextOptionPicker
            className="batch-toolbar-picker"
            ariaLabel="Stock Status"
            value={stockFilter}
            options={[
              { value: "in_stock", label: "In Stock" },
              { value: "", label: "All Stock" },
              { value: "shortage", label: "Shortage" },
              { value: "out_of_stock", label: "Out of Stock" },
            ]}
            onChange={(value) => { setStockFilter(value); setPage(1); }}
          />
        </label>
        <label><Search size={18} /><input placeholder="Search..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <button className="text-button" onClick={() => printTable("Batch History", tableRows, columns, { formatValue: formatBatchCell })}>Print Batch History</button>
      </div>
      <DataTable columns={columns} rows={tableRows} render={(row, key) => row.__summary ? formatBatchCell(row, key) : key === "actions" ? <BatchActions row={row} onEdit={() => openModal(row)} onReport={() => deleteBatch(row)} onRestore={() => restoreBatch(row)} /> : formatBatchCell(row, key)} />
      <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={tableRows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
    </section>
  );
}

function makeBatchSummaryRow(rows = []) {
  const sum = (key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
  return {
    id: "__batch-summary",
    __summary: true,
    batch_no: "Total",
    stock_in: sum("stock_in"),
    stock_out: sum("stock_out"),
    stock_remaining: sum("stock_remaining"),
    purchase_price: sum("purchase_price"),
    purchase_price_before_tax: sum("purchase_price_before_tax"),
    total_cost: sum("total_cost"),
    paid_amount: sum("paid_amount"),
    supplier_outstanding: sum("supplier_outstanding"),
  };
}

function ExpiredBatchesPage({ apiCall, onError, setRoute }) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const columns = [
    ["batch_no", "Batch No."],
    ["shelf_name", "Shelf No."],
    ["product_name", "Name"],
    ["medicine_formula", "Medicine Formula"],
    ["stock_in", "Stock In"],
    ["stock_out", "Stock Out"],
    ["stock_remaining", "Stock Remaining"],
    ["purchase_price", "Stock Purchase Price"],
    ["purchase_price_before_tax", "Stock Purchase Price Before Tax"],
    ["sell_price", "Sell Price"],
    ["cost_price", "Cost Price"],
    ["total_cost", "Total Cost"],
    ["production_date", "Production Date"],
    ["expire_date", "Expire Date"],
    ["created_at", "Created at"],
    ["supplier_name", "Supplier Name"],
    ["paid_amount", "Paid Amount"],
    ["supplier_outstanding", "Supplier Outstanding"],
    ["supplier_invoice_no", "Supplier Invoice no."],
  ];
  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        limit: String(pageSize),
        paged: "true",
      });
      if (search.trim()) params.set("q", search.trim());
      try {
        const pageData = unpackPaged(await apiCall(`/api/batches/expired?${params.toString()}`));
        setRows(pageData.items);
        setTotalRows(pageData.total);
      } catch (error) {
        onError(error);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [apiCall, onError, page, pageSize, search]);
  function formatBatchCell(row, key) {
    if (row.__summary) {
      if (key === "batch_no") return "Total";
      if (["stock_in", "stock_out", "stock_remaining", "purchase_price", "purchase_price_before_tax", "total_cost", "paid_amount", "supplier_outstanding"].includes(key)) return formatCell(row[key]);
      return "-";
    }
    if (key === "batch_no") return row.reference_batch_no != null ? row.reference_batch_no : (row.batch_no || "-");
    if (key === "sell_price") return row.reference_sell_price_display || formatCell(row[key]);
    if (key === "cost_price") return row.reference_cost_price_display || formatCell(row[key]);
    if (key === "created_at") return formatTableDate(row.reference_created_at || row.created_at);
    if (["production_date", "expire_date"].includes(key)) return formatTableDate(row[key]);
    return formatCell(row[key]);
  }
  const tableRows = useMemo(() => rows.length ? [...rows, makeBatchSummaryRow(rows)] : rows, [rows]);
  return (
    <section className="batch-page">
      <div className="list-head">
        <button className="outline" type="button" onClick={() => setRoute("batch")}>Go To Batch Management &raquo;</button>
        <label><Search size={18} /><input placeholder="Search expired batch..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <button className="text-button" type="button" onClick={() => printTable("Expired Batch History", tableRows, columns, { formatValue: formatBatchCell })}>Print Expired Batches</button>
      </div>
      <Panel title="Expired Medicine Batches">
        <DataTable columns={columns} rows={tableRows} render={formatBatchCell} />
        <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
      </Panel>
    </section>
  );
}

function BatchActions({ row, onEdit, onReport, onRestore }) {
  return <LifecycleActions row={row} onEdit={onEdit} onReport={onReport} onRestore={onRestore} />;
}

const crudConfigs = {
  supplier: {
    title: "Supplier",
    addLabel: "Add New Supplier",
    endpoint: "/api/suppliers",
    search: "Search...",
    iconActions: true,
    modalClassName: "supplier-modal",
    modalBodyClassName: "three",
    filterRows: (rows) => rows.filter((supplier) => supplier.status !== "inactive"),
    columns: [
      ["name", "Supplier Name/Company"],
      ["contact_person", "Contact Person"],
      ["phone", "Phone#"],
      ["email", "Email"],
      ["total_batches", "Total Batches"],
      ["stock_purchase_price", "Stock Purchase Price"],
      ["paid_amount", "Paid Amount"],
      ["supplier_outstanding", "Supplier Outstanding"],
      ["payment_status", "Status"],
    ],
    fields: [
      { name: "name", label: "Supplier Name/Company", placeholder: "Supplier name", required: true },
      { name: "contact_person", label: "Contact Person", placeholder: "contact person name" },
      { name: "phone", label: "Phone#", placeholder: "03xx xxxxxxx" },
      { name: "email", label: "Email", placeholder: "Enter email" },
    ],
  },
  category: {
    title: "Category",
    addLabel: "Add New Category",
    endpoint: "/api/categories",
    search: "Search...",
    blankActions: true,
    columns: [["name", "Category Name"], ["type", "Type"]],
    fields: [
      { name: "type", label: "Type", type: "lookup-select", placeholder: "Type", options: [{ id: "medical", name: "Medical" }, { id: "non-medical", name: "Non Medical" }], defaultValue: "medical" },
      { name: "name", label: "Category Name", required: true },
    ],
  },
  medicineformula: {
    title: "Medicine Formula",
    addLabel: "Add New Formula Name",
    endpoint: "/api/medicine-formulas",
    search: "Search...",
    hideActions: true,
    blankEmptyCells: true,
    columns: [["name", "Medicine Formula Name"], ["description", "Description"]],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  manufacturer: {
    title: "Manufacturer",
    addLabel: "Add New Manufacturer",
    endpoint: "/api/manufacturers",
    search: "Search...",
    hideActions: true,
    columns: [["name", "Manufacturer Name"]],
    fields: [{ name: "name", label: "Manufacturer Name", required: true }],
  },
  shelf: {
    title: "Shelf",
    addLabel: "Add New Shelf",
    modalTitle: "Add Shelf",
    endpoint: "/api/shelves",
    search: "Search Medicine",
    columns: [["name", "Name"], ["total_batches", "Total Batches"]],
    fields: [
      { name: "name", label: "Shelf Name", placeholder: "Shelf A", required: true },
    ],
  },
  expenseCategory: {
    title: "Expense Category",
    addLabel: "Add New Category",
    modalTitle: "Add Category",
    endpoint: "/api/expense-categories",
    search: "Search Category",
    iconActions: true,
    hideDelete: true,
    blankEmptyCells: true,
    columns: [["name", "Category Name"], ["description", "Description"]],
    fields: [
      { name: "name", label: "Category Name", placeholder: "Office Supplies", required: true },
      { name: "description", label: "Description", type: "textarea", placeholder: "Enter Description..." },
    ],
  },
};

function CrudPage({ config, rows = [], openModal, apiCall, reload, onError }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [visibleRows, setVisibleRows] = useState([]);
  const [totalRows, setTotalRows] = useState(rows.length);
  const applyConfigFilter = useCallback((items) => config.filterRows ? config.filterRows(items) : items, [config]);
  useEffect(() => {
    const filteredRows = applyConfigFilter(rows);
    setTotalRows(filteredRows.length);
    if (!apiCall || !config.endpoint) setVisibleRows(filteredRows);
  }, [rows, applyConfigFilter, apiCall, config.endpoint]);
  useEffect(() => {
    setSearch("");
    setPage(1);
    setPageSize(50);
  }, [config.endpoint]);
  useEffect(() => {
    if (!apiCall || !config.endpoint) return undefined;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ skip: String((page - 1) * pageSize), limit: String(pageSize), paged: "true" });
      if (search.trim()) params.set("q", search.trim());
      try {
        const pageData = unpackPaged(await apiCall(`${config.endpoint}?${params.toString()}`));
        const filteredRows = applyConfigFilter(pageData.items);
        setVisibleRows(filteredRows);
        setTotalRows(pageData.total || filteredRows.length);
      } catch (error) {
        onError(error);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [apiCall, onError, config.endpoint, search, page, pageSize, applyConfigFilter]);
  async function deleteRow(row) {
    if (!window.confirm(`Delete ${config.title.toLowerCase()}?`)) return;
    try {
      await apiCall(`${config.endpoint}/${row.id}`, { method: "DELETE" });
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  const tableColumns = config.hideActions ? config.columns : [...config.columns, ["actions", "Actions"]];
  return (
    <section className="list-page">
      <div className="list-head">
        <div className="batch-toolbar"><label><Search size={18} /><input placeholder={config.search || "Search..."} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label></div>
        <button className="primary" onClick={() => openModal(null)}>{config.addLabel}</button>
      </div>
      <DataTable columns={tableColumns} rows={visibleRows} render={(row, key) => {
        if (key === "actions") {
          if (config.blankActions) return "";
          return config.iconActions
            ? <CrudIconActions onEdit={() => openModal(row)} onDelete={config.hideDelete ? null : () => deleteRow(row)} />
            : <ActionButtons onEdit={() => openModal(row)} onDelete={() => deleteRow(row)} />;
        }
        if (config.blankEmptyCells && (row[key] == null || row[key] === "")) return "";
        return formatCrudCell(row, key);
      }} />
      <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={visibleRows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
    </section>
  );
}

function formatCrudCell(row, key) {
  if (key === "type") {
    if (row[key] === "non-medical") return "Non Medical";
    if (row[key] === "medical") return "Medical";
  }
  if (["stock_purchase_price", "paid_amount", "supplier_outstanding"].includes(key)) {
    return row[key] == null || row[key] === "" ? "-" : Number(row[key] || 0).toFixed(2);
  }
  return formatCell(row[key]);
}

function CrudModal({ config, row, close, apiCall, reload, onError }) {
  const editing = !!row;
  const [form, setForm] = useState(() => Object.fromEntries(config.fields.map((field) => [field.name, row?.[field.name] ?? field.defaultValue ?? ""])));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    try {
      await apiCall(editing ? `${config.endpoint}/${row.id}` : config.endpoint, { method: editing ? "PUT" : "POST", body: JSON.stringify(cleanPayload(form)) });
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className={`simple-modal ${config.modalClassName || ""}`.trim()} onSubmit={submit}>
        <div className="modal-head"><h2>{editing ? `Edit ${config.title}` : (config.modalTitle || config.addLabel)}</h2><button type="button" onClick={close}><X /></button></div>
        <div className={`simple-modal-body ${config.modalBodyClassName || ""}`.trim()}>
          {config.fields.map((field) => <GenericInput key={field.name} field={field} value={form[field.name] || ""} onChange={(value) => set(field.name, value)} />)}
        </div>
        <div className="modal-actions"><span /><button className="primary">{editing ? (config.editSubmitLabel || "Save") : (config.addSubmitLabel || "Add")}</button></div>
      </form>
    </div>
  );
}

function CrudIconActions({ onEdit, onDelete }) {
  return (
    <div className="icon-actions">
      {onEdit ? <button className="icon-action" type="button" title="Edit" aria-label="Edit" onClick={onEdit}><Pencil size={18} /></button> : null}
      {onDelete ? <button className="icon-action danger-icon" type="button" title="Delete" aria-label="Delete" onClick={onDelete}><Trash2 size={18} /></button> : null}
    </div>
  );
}

function ShelfPage({ data, openModal, apiCall, reload, onError }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState(data.shelves);
  const [totalRows, setTotalRows] = useState(data.shelves.length);
  useEffect(() => { setRows(data.shelves); setTotalRows(data.shelves.length); }, [data.shelves]);
  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ skip: String((page - 1) * pageSize), limit: String(pageSize), paged: "true" });
      if (search.trim()) params.set("q", search.trim());
      try {
        const pageData = unpackPaged(await apiCall(`/api/shelves?${params.toString()}`));
        setRows(pageData.items);
        setTotalRows(pageData.total);
      } catch (error) {
        onError(error);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [apiCall, onError, search, page, pageSize]);
  async function deleteShelf(row) {
    if (!window.confirm(`Delete shelf ${row.name}?`)) return;
    try {
      await apiCall(`/api/shelves/${row.id}`, { method: "DELETE" });
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <section className="list-page">
      <div className="list-head">
        <div className="batch-toolbar"><label><Search size={18} /><input placeholder="Search Medicine" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label></div>
        <button className="primary" onClick={() => openModal(null)}>Add New Shelf</button>
      </div>
      <DataTable
        columns={[["name", "Name"], ["total_batches", "Total Batches"], ["actions", "Actions"]]}
        rows={rows}
        render={(row, key) => key === "actions"
          ? <CrudIconActions onEdit={() => openModal(row)} onDelete={() => deleteShelf(row)} />
          : formatCell(row[key])}
      />
      <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
    </section>
  );
}

function ActionButtons({ onEdit, onDelete, onDownload }) {
  return (
    <div className="icon-actions">
      {onDownload ? <button className="icon-action" type="button" title="Download" aria-label="Download" onClick={onDownload}><Download size={18} /></button> : null}
      {onEdit ? <button className="icon-action" type="button" title="Edit" aria-label="Edit" onClick={onEdit}><Pencil size={18} /></button> : null}
      {onDelete ? <button className="icon-action danger-icon" type="button" title="Delete" aria-label="Delete" onClick={onDelete}><Trash2 size={18} /></button> : null}
    </div>
  );
}

function ProductsPage({ type, initialStockFilter = "", data, apiCall, reload, onError }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("active");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState([]);
  const [referenceStockCounts, setReferenceStockCounts] = useState(null);
  const medical = type === "medical";
  const matchingProducts = useMemo(() => data.products.filter((product) => product.type === type && (statusTab === "active" ? product.status !== "reported" : product.status === "reported")), [data.products, statusTab, type]);
  const batchCounts = useMemo(() => {
    const counts = new Map();
    data.batches.forEach((batch) => counts.set(batch.product_id, (counts.get(batch.product_id) || 0) + 1));
    return counts;
  }, [data.batches]);
  const stockCounts = useMemo(() => ({
    without_stock: matchingProducts.filter((product) => !batchCounts.get(product.id)).length,
    out_of_stock: matchingProducts.filter((product) => batchCounts.get(product.id) && Number(product.remaining_quantity || 0) <= 0).length,
    low_stock: matchingProducts.filter((product) => Number(product.remaining_quantity || 0) > 0 && Number(product.remaining_quantity || 0) <= 10).length,
  }), [batchCounts, matchingProducts]);
  const displayedStockCounts = referenceStockCounts || stockCounts;
  useEffect(() => {
    setStatusTab("active");
    setStockFilter(initialStockFilter || "");
    setPage(1);
  }, [initialStockFilter, type]);
  const columns = medical
    ? [["name", "Name"], ["formula_name", "Formula"], ["dose", "Dose"], ["total_quantity", "Total Quantity"], ["remaining_quantity", "Remaining Quantity"], ["display_generic_name", "Generic Name"], ["category_name", "Category"], ["manufacturer_name", "Manufacturer Name"], ["actions", "Actions"]]
    : [["name", "Name"], ["manufacturer_name", "Brand Name"], ["category_name", "Category"], ["total_quantity", "Total Quantity"], ["remaining_quantity", "Remaining Quantity"], ["actions", "Actions"]];
  const [totalRows, setTotalRows] = useState(0);
  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({
      type,
      status: statusTab,
      skip: String((page - 1) * pageSize),
      limit: String(pageSize),
      reference_only: "true",
      paged: "true",
    });
    if (search.trim()) params.set("q", search.trim());
    if (stockFilter) params.set("stock_filter", stockFilter);
    const pageData = unpackPaged(await apiCall(`/api/products?${params.toString()}`));
    setRows(pageData.items);
    setTotalRows(pageData.total);
    setReferenceStockCounts(pageData.stock_counts || null);
  }, [apiCall, page, pageSize, search, statusTab, stockFilter, type]);
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts().catch((error) => onError(error));
    }, 150);
    return () => clearTimeout(timer);
  }, [loadProducts, onError]);
  function changeStatus(nextStatus) {
    setStatusTab(nextStatus);
    setStockFilter("");
    setPage(1);
  }
  function changeStockFilter(nextFilter) {
    setStockFilter((current) => current === nextFilter ? "" : nextFilter);
    setPage(1);
  }
  async function deleteProduct(row) {
    if (!window.confirm(`Report ${row.name}?`)) return;
    try {
      await apiCall(`/api/products/${row.id}`, { method: "DELETE" });
      await reload();
      await loadProducts();
    } catch (error) {
      onError(error);
    }
  }
  async function restoreProduct(row) {
    try {
      await apiCall(`/api/products/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "active" }),
      });
      await reload();
      changeStatus("active");
    } catch (error) {
      onError(error);
    }
  }
  return (
    <section className="list-page">
      <div className="tabs"><label><input type="radio" checked={statusTab === "active"} onChange={() => changeStatus("active")} /> {medical ? "Active Medicines" : "Active Non-Medicine"}</label><label><input type="radio" checked={statusTab === "reported"} onChange={() => changeStatus("reported")} /> {medical ? "Reported Medicines" : "Reported Non-Medicine"}</label></div>
      {statusTab === "active" ? <div className="batch-alerts product-alerts">
        <div className="batch-alert-messages">
          <span><span className="alert-icon danger">!</span>Some {medical ? "medicines" : "products"} are <strong>out of stock.</strong></span>
          <span><span className="alert-icon warning">!</span>Some {medical ? "medicines" : "products"} are <strong className="warning-text">low in stock.</strong></span>
          <span><span className="alert-icon warning">!</span>Some {medical ? "medicines" : "products"} have been added but are awaiting stock entry.</span>
        </div>
        <div className="batch-alert-filter">
          <label><input type="checkbox" checked={stockFilter === "without_stock"} onChange={() => changeStockFilter("without_stock")} /> Products Without Stock ({displayedStockCounts.without_stock})</label>
          <label><input type="checkbox" checked={stockFilter === "out_of_stock"} onChange={() => changeStockFilter("out_of_stock")} /> Out of Stock ({displayedStockCounts.out_of_stock})</label>
          <label><input type="checkbox" checked={stockFilter === "low_stock"} onChange={() => changeStockFilter("low_stock")} /> Low in Stock ({displayedStockCounts.low_stock})</label>
        </div>
      </div> : null}
      <div className="list-head">
        <div className="batch-toolbar"><label><Search size={18} /><input placeholder="Search..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label></div>
        <button className="primary" onClick={() => setModal({ row: null })}>{medical ? "Add New Medicine" : "Add New"}</button>
      </div>
      <DataTable columns={columns} rows={rows} render={(row, key) => {
        if (key === "actions") return <LifecycleActions row={row} onEdit={() => setModal({ row })} onReport={() => deleteProduct(row)} onRestore={() => restoreProduct(row)} />;
        if (["total_quantity", "remaining_quantity"].includes(key)) return formatIndianInteger(row[key]);
        return formatCell(row[key]);
      }} />
      <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
      {modal ? <ProductModal type={type} row={modal.row} data={data} close={() => setModal(null)} apiCall={apiCall} reload={reload} onError={onError} /> : null}
    </section>
  );
}

function LifecycleActions({ row, onEdit, onReport, onRestore }) {
  const reported = row.status === "reported";
  return (
    <div className="icon-actions">
      <button className="icon-action" type="button" title="Edit" aria-label="Edit" onClick={onEdit}><Pencil size={18} /></button>
      {reported
        ? <button className="icon-action" type="button" title="Restore" aria-label="Restore" onClick={onRestore}><RotateCcw size={18} /></button>
        : <button className="icon-action danger-icon" type="button" title="Report" aria-label="Report" onClick={onReport}><Trash2 size={18} /></button>}
    </div>
  );
}

function ProductModal({ type, row, data, close, apiCall, reload, onError }) {
  const medical = type === "medical";
  const editing = !!row;
  const [form, setForm] = useState(() => ({ type, name: "", ...(row || {}) }));
  const [quickAdd, setQuickAdd] = useState(null);
  const categoryOptions = data.categories.filter((category) => category.type === type);
  const [formulaQuery, setFormulaQuery] = useState(() => row?.formula_name || nameById(data.formulas, row?.formula_id));
  const [categoryQuery, setCategoryQuery] = useState(() => row?.category_name || nameById(categoryOptions, row?.category_id));
  const [manufacturerQuery, setManufacturerQuery] = useState(() => row?.manufacturer_name || nameById(data.manufacturers, row?.manufacturer_id));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    try {
      await apiCall(editing ? `/api/products/${row.id}` : "/api/products", { method: editing ? "PUT" : "POST", body: JSON.stringify(cleanPayload(form)) });
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  function quickAddCreated(created) {
    if (quickAdd?.type === "formula") {
      set("formula_id", created.id);
      setFormulaQuery(created.name);
    }
    if (quickAdd?.type === "manufacturer") {
      set("manufacturer_id", created.id);
      setManufacturerQuery(created.name);
    }
    if (quickAdd?.type === "category") {
      set("category_id", created.id);
      setCategoryQuery(created.name);
    }
    setQuickAdd(null);
  }
  return (
    <div className="modal-backdrop">
      <form className="simple-modal product-modal" onSubmit={submit}>
        <div className="modal-head"><h2>{editing ? "Edit Product" : medical ? "Add Medical Product" : "Add Non Medical Product"}</h2><button type="button" onClick={close}><X /></button></div>
        <div className="simple-modal-body three">
          <Field label="Bar Code" value={form.barcode || ""} onChange={(v) => set("barcode", v)} placeholder="Enter barcode." />
          <Field label="Name" required value={form.name || ""} onChange={(v) => set("name", v)} placeholder="Enter Name" />
          {medical ? <LookupField label="Medical Formula" value={form.formula_id || ""} query={formulaQuery === "-" ? "" : formulaQuery} onQueryChange={(value) => { setFormulaQuery(value); set("formula_id", ""); }} onSelect={(option) => { set("formula_id", option.id); setFormulaQuery(option.name); }} options={data.formulas} placeholder="Select Medicine Formula" onAdd={() => setQuickAdd({ type: "formula", initialName: formulaQuery })} /> : <LookupField label="Brand/Manufacturer Name" value={form.manufacturer_id || ""} query={manufacturerQuery === "-" ? "" : manufacturerQuery} onQueryChange={(value) => { setManufacturerQuery(value); set("manufacturer_id", ""); }} onSelect={(option) => { set("manufacturer_id", option.id); setManufacturerQuery(option.name); }} options={data.manufacturers} placeholder="Select Manufacturer" />}
          {medical ? <LookupField label="Category" value={form.category_id || ""} query={categoryQuery === "-" ? "" : categoryQuery} onQueryChange={(value) => { setCategoryQuery(value); set("category_id", ""); }} onSelect={(option) => { set("category_id", option.id); setCategoryQuery(option.name); }} options={categoryOptions} placeholder="Select Category" /> : null}
          {medical
            ? <ProductMeasureField label="Dose" primaryValue={form.dose || ""} primaryPlaceholder="Enter Dose" onPrimaryChange={(v) => set("dose", v)} unitValue={form.unit || ""} unitPlaceholder="Sel. Unit" onUnitChange={(v) => set("unit", v)} />
            : <ProductMeasureField label="Weight" primaryValue={form.weight || ""} primaryPlaceholder="Enter Weight" onPrimaryChange={(v) => set("weight", v)} unitValue={form.unit || ""} unitPlaceholder="Select Unit" onUnitChange={(v) => set("unit", v)} />}
          {medical ? null : <LookupField label="Category" value={form.category_id || ""} query={categoryQuery === "-" ? "" : categoryQuery} onQueryChange={(value) => { setCategoryQuery(value); set("category_id", ""); }} onSelect={(option) => { set("category_id", option.id); setCategoryQuery(option.name); }} options={categoryOptions} placeholder="Select Category" />}
          {medical ? <Field label="Generic Name" value={form.generic_name || ""} onChange={(v) => set("generic_name", v)} placeholder="Enter Generic Name" /> : null}
          {medical ? <LookupField label="Manufacturer Name" value={form.manufacturer_id || ""} query={manufacturerQuery === "-" ? "" : manufacturerQuery} onQueryChange={(value) => { setManufacturerQuery(value); set("manufacturer_id", ""); }} onSelect={(option) => { set("manufacturer_id", option.id); setManufacturerQuery(option.name); }} options={data.manufacturers} placeholder="Select Manufacturer" /> : null}
          {medical ? <label className="check-field"><input type="checkbox" checked={!!form.prescription_required} onChange={(event) => set("prescription_required", event.target.checked)} /> Prescription needed for this medicine</label> : null}
        </div>
        <div className="modal-actions"><span /><button className="primary">{editing ? "Save" : "Add"}</button></div>
      </form>
      {quickAdd ? <QuickAddModal type={quickAdd.type} productType={type} close={() => setQuickAdd(null)} apiCall={apiCall} reload={reload} onError={onError} onCreated={quickAddCreated} /> : null}
    </div>
  );
}

function ProductMeasureField({ label, primaryValue, primaryPlaceholder, onPrimaryChange, unitValue, unitPlaceholder, onUnitChange }) {
  return (
    <label className="product-measure-field">
      <span className="field-title">{label}</span>
      <span className="product-measure-inputs">
        <input type="text" value={primaryValue} placeholder={primaryPlaceholder} onChange={(event) => onPrimaryChange(event.target.value)} />
        <input type="text" value={unitValue} placeholder={unitPlaceholder} onChange={(event) => onUnitChange(event.target.value)} />
      </span>
    </label>
  );
}

function DemandPage({ data, apiCall, reload, onError }) {
  const demandTypeOptions = [{ id: "Unit", name: "Unit" }, { id: "Box", name: "Box" }];
  const [form, setForm] = useState({ supplier_id: "", product_id: "", quantity_type: "Unit", quantity: "" });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [quantityTypeQuery, setQuantityTypeQuery] = useState("Unit");
  const [quickAdd, setQuickAdd] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState(data.demands);
  const [totalRows, setTotalRows] = useState(data.demands.length);
  const [printing, setPrinting] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  useEffect(() => { setRows(data.demands); setTotalRows(data.demands.length); }, [data.demands]);
  function demandParams(skip = (page - 1) * pageSize, limit = pageSize) {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit), paged: "true" });
    if (search.trim()) params.set("q", search.trim());
    return params;
  }
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const pageData = unpackPaged(await apiCall(`/api/demands?${demandParams().toString()}`));
        setRows(pageData.items);
        setTotalRows(pageData.total);
      } catch (error) {
        onError(error);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [apiCall, onError, search, page, pageSize]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  function selectSupplier(option) {
    set("supplier_id", option.id);
    setSupplierQuery(option.name);
  }
  function selectProduct(option) {
    set("product_id", option.id);
    setProductQuery(option.name);
  }
  function selectDemandType(option) {
    set("quantity_type", option.id);
    setQuantityTypeQuery(option.name);
  }
  function quickAddCreated(created) {
    if (quickAdd?.type === "supplier") selectSupplier(created);
    if (quickAdd?.type === "product") selectProduct(created);
  }
  function resetDemandForm() {
    setForm({ supplier_id: "", product_id: "", quantity_type: "Unit", quantity: "" });
    setSupplierQuery("");
    setProductQuery("");
    setQuantityTypeQuery("Unit");
  }
  async function add(event) {
    event.preventDefault();
    if (!form.supplier_id) {
      setValidationMessage("Please select supplier");
      return;
    }
    if (!form.product_id) {
      setValidationMessage("Please select product");
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      setValidationMessage("Please enter quantity");
      return;
    }
    const matchedType = demandTypeOptions.find((option) => option.name.toLowerCase() === quantityTypeQuery.trim().toLowerCase());
    const quantityType = form.quantity_type || matchedType?.id || quantityTypeQuery.trim() || "Unit";
    try {
      await apiCall(editing ? `/api/demands/${editing.id}` : "/api/demands", { method: editing ? "PUT" : "POST", body: JSON.stringify({ ...cleanPayload(form), quantity_type: quantityType, supplier_id: Number(form.supplier_id), product_id: Number(form.product_id), quantity: Number(form.quantity) }) });
      resetDemandForm();
      setEditing(null);
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  async function deleteDemand(row) {
    if (!window.confirm("Delete demand item?")) return;
    try {
      await apiCall(`/api/demands/${row.id}`, { method: "DELETE" });
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  function editDemand(row) {
    setEditing(row);
    setForm({ supplier_id: row.supplier_id || "", product_id: row.product_id || "", quantity_type: row.quantity_type || "Unit", quantity: row.quantity || "" });
    setSupplierQuery(row.supplier_name || nameById(data.suppliers, row.supplier_id));
    setProductQuery(row.product_name || nameById(data.products, row.product_id));
    setQuantityTypeQuery(row.quantity_type || "Unit");
  }
  async function orderDemand(row) {
    try {
      await apiCall(`/api/demands/${row.id}/order`, { method: "POST" });
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  async function printDemandList() {
    setPrinting(true);
    try {
      const pageData = unpackPaged(await apiCall(`/api/demands?${demandParams(0, Math.max(totalRows, pageSize, 10000)).toString()}`));
      printTable("Demand List", pageData.items, columns, {
        formatValue: (row, key) => {
          if (key === "supplier_name") return row.supplier_name || nameById(data.suppliers, row.supplier_id);
          if (key === "product_name") return row.product_name || nameById(data.products, row.product_id);
          return formatCell(row[key]);
        },
      });
    } catch (error) {
      onError(error);
    } finally {
      setPrinting(false);
    }
  }
  const columns = [["supplier_name", "Supplier Name"], ["product_name", "Product Name"], ["quantity_type", "Type"], ["quantity", "Quantity"], ["actions", "Actions"]];
  return (
    <section className="list-page">
      <form className="table-entry-form" onSubmit={add} noValidate>
        <table className="entry-table list-entry-table">
          <thead><tr><th>Supplier Name</th><th>Product Name</th><th>Type</th><th>Quantity</th><th>Action</th></tr></thead>
          <tbody><tr>
            <td><LookupField hideLabel label="Supplier Name" required value={form.supplier_id} query={supplierQuery} onQueryChange={(value) => { setSupplierQuery(value); set("supplier_id", ""); }} onSelect={selectSupplier} options={data.suppliers} placeholder="Supplier Name" addLabel="+ Add New" onAdd={() => setQuickAdd({ type: "supplier", initialName: supplierQuery })} /></td>
            <td><LookupField hideLabel label="Product Name" required value={form.product_id} query={productQuery} onQueryChange={(value) => { setProductQuery(value); set("product_id", ""); }} onSelect={selectProduct} options={data.products} placeholder="Medicine Name" addLabel="+ Add New" onAdd={() => setQuickAdd({ type: "product", initialName: productQuery })} /></td>
            <td><LookupField hideLabel label="Type" required value={form.quantity_type} query={quantityTypeQuery} onQueryChange={(value) => { setQuantityTypeQuery(value); set("quantity_type", ""); }} onSelect={selectDemandType} options={demandTypeOptions} placeholder="" addLabel="" /></td>
            <td><Field hideLabel label="Quantity" type="number" value={form.quantity} onChange={(v) => set("quantity", v)} placeholder="Enter Quantity" /></td>
            <td><button className="primary">{editing ? "Save" : "Add To List"}</button></td>
          </tr></tbody>
        </table>
        {editing ? <button className="outline" type="button" onClick={() => { setEditing(null); resetDemandForm(); }}>Cancel</button> : null}
      </form>
      <div className="list-head">
        <div className="batch-toolbar"><label><Search size={18} /><input placeholder="Search..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label></div>
        <button className="text-button" type="button" disabled={printing} onClick={printDemandList}>{printing ? "Preparing..." : "Print Demand List"}</button>
        <h2>Demand Items List</h2>
      </div>
      <DataTable columns={columns} rows={rows} emptyText="No Demand Found" render={(row, key) => {
        if (key === "supplier_name") return row.supplier_name || nameById(data.suppliers, row.supplier_id);
        if (key === "product_name") return row.product_name || nameById(data.products, row.product_id);
        if (key === "actions") return (
          <div className="icon-actions">
            <button className="icon-action" type="button" title="Order" aria-label="Order" disabled={row.status !== "pending"} onClick={() => orderDemand(row)}><ShoppingCart size={18} /></button>
            <button className="icon-action" type="button" title="Edit" aria-label="Edit" onClick={() => editDemand(row)}><Pencil size={18} /></button>
            <button className="icon-action danger-icon" type="button" title="Delete" aria-label="Delete" onClick={() => deleteDemand(row)}><Trash2 size={18} /></button>
          </div>
        );
        return formatCell(row[key]);
      }} />
      {totalRows ? <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} /> : null}
      {quickAdd ? <QuickAddModal type={quickAdd.type} initialName={quickAdd.initialName} productType="medical" close={() => setQuickAdd(null)} apiCall={apiCall} reload={reload} onError={onError} onCreated={quickAddCreated} /> : null}
      {validationMessage ? <ValidationModal message={validationMessage} close={() => setValidationMessage("")} /> : null}
    </section>
  );
}

function StockAuditPage({ data, apiCall, reload, onError }) {
  const auditTypeOptions = [{ id: "Unit", name: "Unit" }, { id: "Box", name: "Box" }];
  const adjustmentTypeOptions = [{ id: "Increase", name: "Increase" }, { id: "Decrease", name: "Decrease" }];
  const [form, setForm] = useState({ product_id: "", batch_id: "", quantity_type: "Unit", quantity_adjusted: "", adjustment_type: "Increase" });
  const [pending, setPending] = useState([]);
  const [editingAudit, setEditingAudit] = useState(null);
  const [search, setSearch] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [batchQuery, setBatchQuery] = useState("");
  const [quantityTypeQuery, setQuantityTypeQuery] = useState("Unit");
  const [adjustmentTypeQuery, setAdjustmentTypeQuery] = useState("Increase");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [savedRows, setSavedRows] = useState(data.stockAudits);
  const [totalRows, setTotalRows] = useState(data.stockAudits.length);
  const loadAudits = useCallback(async () => {
    const params = new URLSearchParams({
      skip: String((page - 1) * pageSize),
      limit: String(pageSize),
      paged: "true",
    });
    if (search.trim()) params.set("q", search.trim());
    const pageData = unpackPaged(await apiCall(`/api/stock-audits?${params.toString()}`));
    setSavedRows(pageData.items);
    setTotalRows(pageData.total);
  }, [apiCall, page, pageSize, search]);
  useEffect(() => {
    setSavedRows(data.stockAudits.slice((page - 1) * pageSize, page * pageSize));
    setTotalRows(data.stockAudits.length);
  }, [data.stockAudits, page, pageSize]);
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAudits().catch((error) => onError(error));
    }, 150);
    return () => clearTimeout(timer);
  }, [loadAudits, onError]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const batchOptions = data.batches
    .filter((batch) => !form.product_id || Number(batch.product_id) === Number(form.product_id))
    .map((batch) => ({ ...batch, name: `${batch.batch_no} - Stock ${batch.stock_remaining}` }));
  function selectAuditProduct(product) {
    setForm((current) => ({ ...current, product_id: product.id, batch_id: "" }));
    setProductQuery(product.name);
    setBatchQuery("");
  }
  function selectAuditBatch(batch) {
    set("batch_id", batch.id);
    setBatchQuery(batch.name);
  }
  function selectAuditType(option) {
    set("quantity_type", option.id);
    setQuantityTypeQuery(option.name);
  }
  function selectAdjustmentType(option) {
    set("adjustment_type", option.id);
    setAdjustmentTypeQuery(option.name);
  }
  function resetAuditForm() {
    setForm({ product_id: "", batch_id: "", quantity_type: "Unit", quantity_adjusted: "", adjustment_type: "Increase" });
    setProductQuery("");
    setBatchQuery("");
    setQuantityTypeQuery("Unit");
    setAdjustmentTypeQuery("Increase");
  }
  function projectedStockForBatch(batchId) {
    const batch = data.batches.find((item) => Number(item.id) === Number(batchId));
    return pending
      .filter((item) => Number(item.batch_id) === Number(batchId))
      .reduce((stock, item) => item.adjustment_type === "Decrease" ? stock - Number(item.quantity_adjusted || 0) : stock + Number(item.quantity_adjusted || 0), Number(batch?.stock_remaining || 0));
  }
  async function add(event) {
    event.preventDefault();
    const batch = data.batches.find((item) => Number(item.id) === Number(form.batch_id));
    if (!form.product_id || !form.batch_id || !batch) {
      onError(new Error("Select medicine and batch before adding to list."));
      return;
    }
    const quantity = Number(form.quantity_adjusted || 0);
    if (quantity <= 0) {
      onError(new Error("Enter a valid quantity."));
      return;
    }
    const matchedQuantityType = auditTypeOptions.find((option) => option.name.toLowerCase() === quantityTypeQuery.trim().toLowerCase());
    const matchedAdjustmentType = adjustmentTypeOptions.find((option) => option.name.toLowerCase() === adjustmentTypeQuery.trim().toLowerCase());
    const quantityType = form.quantity_type || matchedQuantityType?.id || quantityTypeQuery.trim() || "Unit";
    const adjustmentType = form.adjustment_type || matchedAdjustmentType?.id || adjustmentTypeQuery.trim() || "Increase";
    const unitsPerBox = Number(batch.units_per_box || 1) || 1;
    const effectiveQuantity = quantityType === "Box" ? quantity * unitsPerBox : quantity;
    let before = projectedStockForBatch(form.batch_id);
    if (editingAudit && Number(editingAudit.batch_id) === Number(form.batch_id)) {
      const previousQuantity = Number(editingAudit.quantity_adjusted || 0);
      before = editingAudit.adjustment_type === "Decrease" ? before + previousQuantity : before - previousQuantity;
    }
    const after = adjustmentType === "Decrease" ? before - effectiveQuantity : before + effectiveQuantity;
    if (after < 0) {
      onError(new Error("Adjustment exceeds current stock."));
      return;
    }
    if (editingAudit) {
      try {
        await apiCall(`/api/stock-audits/${editingAudit.id}`, {
          method: "PUT",
          body: JSON.stringify({
            product_id: Number(form.product_id),
            batch_id: Number(form.batch_id),
            quantity_type: quantityType,
            quantity_adjusted: quantity,
            adjustment_type: adjustmentType,
          }),
        });
        setEditingAudit(null);
        resetAuditForm();
        await reload();
        await loadAudits();
      } catch (error) {
        onError(error);
      }
      return;
    }
    setPending((items) => [...items, {
      ...form,
      id: `${form.batch_id}-${Date.now()}`,
      product_id: Number(form.product_id),
      batch_id: Number(form.batch_id),
      entered_quantity: quantity,
      quantity_adjusted: effectiveQuantity,
      quantity_before: before,
      quantity_after: after,
      quantity_type: quantityType,
      adjustment_type: adjustmentType,
      amount: effectiveQuantity * Number(batch.cost_price || batch.sell_price || 0),
    }]);
    resetAuditForm();
  }
  function editAudit(row) {
    const batch = data.batches.find((item) => Number(item.id) === Number(row.batch_id));
    const product = data.products.find((item) => Number(item.id) === Number(row.product_id));
    const unitsPerBox = Number(batch?.units_per_box || 1) || 1;
    const enteredQuantity = row.quantity_type === "Box" ? Number(row.quantity_adjusted || 0) / unitsPerBox : Number(row.quantity_adjusted || 0);
    setEditingAudit(row);
    setProductQuery(product?.name || nameById(data.products, row.product_id));
    setBatchQuery(batch ? `${batch.batch_no} - Stock ${batch.stock_remaining}` : batchNo(data.batches, row.batch_id));
    setQuantityTypeQuery(row.quantity_type || "Unit");
    setAdjustmentTypeQuery(row.adjustment_type || "Increase");
    setForm({
      product_id: row.product_id || "",
      batch_id: row.batch_id || "",
      quantity_type: row.quantity_type || "Unit",
      quantity_adjusted: enteredQuantity || "",
      adjustment_type: row.adjustment_type || "Increase",
    });
  }
  function cancelEditAudit() {
    setEditingAudit(null);
    resetAuditForm();
  }
  async function deleteAudit(row) {
    if (!window.confirm("Delete stock audit item?")) return;
    try {
      await apiCall(`/api/stock-audits/${row.id}`, { method: "DELETE" });
      await reload();
      await loadAudits();
    } catch (error) {
      onError(error);
    }
  }
  async function saveAudits() {
    if (!pending.length) return;
    try {
      await apiCall("/api/stock-audits/bulk", {
        method: "POST",
        body: JSON.stringify(pending.map((item) => ({
          product_id: item.product_id,
          batch_id: item.batch_id,
          quantity_type: item.quantity_type,
          quantity_adjusted: Number(item.entered_quantity || item.quantity_adjusted),
          adjustment_type: item.adjustment_type,
        }))),
      });
      setPending([]);
      await reload();
      await loadAudits();
    } catch (error) {
      onError(error);
    }
  }
  const rows = [...pending.map((item) => ({ ...item, pending: true })), ...savedRows];
  const totalAuditAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return (
    <section className="list-page">
      <form className="table-entry-form" onSubmit={add}>
        <table className="entry-table list-entry-table stock-audit-entry-table">
          <thead><tr><th>Product Name</th><th>Batch</th><th>Type</th><th>Quantity</th><th>Select Adjustment</th><th></th></tr></thead>
          <tbody><tr>
            <td><LookupField hideLabel label="Product Name" required value={form.product_id} query={productQuery} onQueryChange={(value) => { setProductQuery(value); setForm((current) => ({ ...current, product_id: "", batch_id: "" })); setBatchQuery(""); }} onSelect={selectAuditProduct} options={data.products.filter((product) => product.status !== "reported")} placeholder="Search by medicine name..." /></td>
            <td><LookupField hideLabel label="Batch" required value={form.batch_id} query={batchQuery} onQueryChange={(value) => { setBatchQuery(value); set("batch_id", ""); }} onSelect={selectAuditBatch} options={batchOptions} placeholder="Select Batch" /></td>
            <td><LookupField hideLabel label="Type" required value={form.quantity_type} query={quantityTypeQuery} onQueryChange={(value) => { setQuantityTypeQuery(value); set("quantity_type", ""); }} onSelect={selectAuditType} options={auditTypeOptions} placeholder="" addLabel="" /></td>
            <td><Field hideLabel label="Quantity" type="number" value={form.quantity_adjusted} onChange={(v) => set("quantity_adjusted", v)} placeholder="Enter Quantity" /></td>
            <td><LookupField hideLabel label="Select Adjustment" required value={form.adjustment_type} query={adjustmentTypeQuery} onQueryChange={(value) => { setAdjustmentTypeQuery(value); set("adjustment_type", ""); }} onSelect={selectAdjustmentType} options={adjustmentTypeOptions} placeholder="" addLabel="" /></td>
            <td><button className="primary">{editingAudit ? "Save" : "Add To List"}</button></td>
          </tr></tbody>
        </table>
        {editingAudit ? <button className="outline" type="button" onClick={cancelEditAudit}>Cancel</button> : null}
      </form>
      <div className="list-head"><h2>Stock Audit List</h2></div>
      <DataTable columns={[["product_id", "Product Name"], ["batch_id", "Batch No."], ["quantity_type", "Quantity Type"], ["quantity_before", "Quantity Before"], ["quantity_adjusted", "Quantity Adjusted"], ["quantity_after", "Quantity After"], ["adjustment_type", "Adjustment Type"], ["amount", "Amount"], ["actions", "Actions"]]} rows={rows} render={(row, key) => {
        if (key === "product_id") return nameById(data.products, row[key]);
        if (key === "batch_id") return batchNo(data.batches, row[key]);
        if (key === "actions") return row.pending ? (
          <div className="icon-actions"><button className="icon-action danger-icon" type="button" title="Remove" aria-label="Remove" onClick={() => setPending((items) => items.filter((item) => item.id !== row.id))}><Trash2 size={18} /></button></div>
        ) : <CrudIconActions onEdit={() => editAudit(row)} onDelete={() => deleteAudit(row)} />;
        return formatCell(row[key]);
      }} />
      {totalRows + pending.length ? <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows + pending.length} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} /> : null}
      <div className="sale-total audit-total"><span>Total Amount</span><strong>Rs. {formatCompactNumber(totalAuditAmount)}</strong></div>
      <div className="page-actions"><button className="primary" type="button" disabled={!pending.length} onClick={saveAudits}>SAVE</button></div>
    </section>
  );
}

function StockPurchasePage({ apiCall, onError }) {
  const [search, setSearch] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [printing, setPrinting] = useState(false);
  const columns = [["batch_no", "Batch No."], ["medicine_name", "Medicine Name"], ["quantity", "Quantity"], ["rate", "Rate"], ["total_amount", "Total Amt"], ["extra_discount_bonus", "Extra Discount/Bonus"], ["purchase_date", "Purchase Date"], ["stock_cost_price", "Stock Cost Price"], ["sales_tax", "Sales Tax"], ["invoice_id", "Invoice ID"], ["expire_date", "Expire Date"], ["supplier_name", "Supplier Name"]];
  function stockPurchaseParams(skip = (page - 1) * pageSize, limit = pageSize) {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });
    if (search.trim()) params.set("q", search.trim());
    if (purchaseDate) params.set("purchase_date", formatDisplayDate(purchaseDate));
    return params;
  }
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const pageData = unpackPaged(await apiCall(`/api/reports/stock-purchases?${stockPurchaseParams().toString()}`));
        setRows(pageData.items);
        setTotalRows(pageData.total);
      } catch (error) {
        onError(error);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [apiCall, onError, search, purchaseDate, page, pageSize]);
  async function printStockHistory() {
    setPrinting(true);
    try {
      const params = stockPurchaseParams(0, Math.max(totalRows, pageSize, 10000));
      const pageData = unpackPaged(await apiCall(`/api/reports/stock-purchases?${params.toString()}`));
      printStockPurchaseHistory(pageData.items, columns, {
        search: search.trim(),
        purchaseDate: purchaseDate ? formatDisplayDate(purchaseDate) : "",
      });
    } catch (error) {
      onError(error);
    } finally {
      setPrinting(false);
    }
  }
  return (
    <section className="list-page">
      <div className="batch-toolbar">
        <label><Search size={18} /><input placeholder="Search..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <label><span className="field-title">Purchase Date</span><input type="date" value={purchaseDate} onChange={(event) => { setPurchaseDate(event.target.value); setPage(1); }} /></label>
        <button className="text-button" type="button" disabled={printing} onClick={printStockHistory}>{printing ? "Preparing..." : "Print Stock History"}</button>
      </div>
      <DataTable columns={columns} rows={rows} render={(row, key) => {
        if (["batch_no", "invoice_id"].includes(key)) return row[key] || "";
        return formatCell(row[key]);
      }} />
      <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
    </section>
  );
}

function OrderPurchasePage({ data, apiCall, reload, onError }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("medical");
  const [receiveOrder, setReceiveOrder] = useState(null);
  const [orderProductTarget, setOrderProductTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const orderPurchaseProducts = useCallback((items) => {
    if (type !== "medical") return items;
    return items
      .filter((product) => referenceOrderPurchaseIndex(product) != null)
      .sort((left, right) => referenceOrderPurchaseIndex(left) - referenceOrderPurchaseIndex(right));
  }, [type]);
  const matchingProducts = useMemo(() => orderPurchaseProducts(data.products.filter((product) => product.type === type && product.status !== "reported" && needsOrderPurchase(product))), [data.products, orderPurchaseProducts, type]);
  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({
      type,
      status: "active",
      stock_filter: "order_purchase",
      reference_only: "true",
      skip: String((page - 1) * pageSize),
      limit: String(pageSize),
      paged: "true",
    });
    if (search.trim()) params.set("q", search.trim());
    const pageData = unpackPaged(await apiCall(`/api/products?${params.toString()}`));
    const orderedItems = orderPurchaseProducts(pageData.items);
    setRows(orderedItems);
    setTotalRows(type === "medical" ? orderedItems.length : pageData.total);
  }, [apiCall, orderPurchaseProducts, page, pageSize, search, type]);
  useEffect(() => {
    setRows(matchingProducts.slice((page - 1) * pageSize, page * pageSize));
    setTotalRows(matchingProducts.length);
  }, [matchingProducts, page, pageSize]);
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts().catch((error) => onError(error));
    }, 150);
    return () => clearTimeout(timer);
  }, [loadProducts, onError]);
  function activeOrder(product) {
    return data.purchaseOrders.find((row) => Number(row.product_id) === Number(product.id) && row.status !== "cancelled" && row.status !== "received");
  }
  async function cancelPurchaseOrder(order) {
    if (!window.confirm(`Cancel purchase order for ${order.product_name || "this product"}?`)) return;
    try {
      await apiCall(`/api/purchase-orders/${order.id}`, { method: "DELETE" });
      await reload();
      await loadProducts();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <section className="list-page">
      <div className="tabs"><label><input type="radio" checked={type === "medical"} onChange={() => { setType("medical"); setPage(1); }} /> Medical</label><label><input type="radio" checked={type === "non-medical"} onChange={() => { setType("non-medical"); setPage(1); }} /> Non Medical</label></div>
      <div className="batch-toolbar"><label><Search size={18} /><input placeholder="Search..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label></div>
      <DataTable columns={[["name", "Medicine Name"], ["dose", "Dose"], ["total_quantity", "Total Quantity"], ["remaining_quantity", "R. Quantity"], ["manufacturer_name", "Manufacturer Name"], ["actions", "Actions"]]} rows={rows} render={(row, key) => {
        if (key === "actions") {
          const order = activeOrder(row);
          return <div className="icon-actions">
            <button className="icon-action" type="button" title={order ? `Reorder (${order.status})` : "Order"} aria-label={order ? "reorder" : "order"} onClick={() => setOrderProductTarget(row)}><ShoppingCart size={18} /></button>
            {order ? <button className="icon-action" type="button" title="Receive" aria-label="receive" onClick={() => setReceiveOrder(order)}><Package size={18} /></button> : null}
            {order ? <button className="icon-action danger-icon" type="button" title="Cancel Order" aria-label="cancel order" onClick={() => cancelPurchaseOrder(order)}><Trash2 size={18} /></button> : null}
          </div>;
        }
        if (key === "dose" && type === "non-medical") return referenceNonMedicalOrderPurchaseDose.get(String(row.name || "").trim().toLowerCase()) || row.weight || row.dose || "-";
        return formatCell(row[key]);
      }} />
      <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
      {orderProductTarget ? <OrderProductModal product={orderProductTarget} data={data} close={() => setOrderProductTarget(null)} apiCall={apiCall} reload={async () => { await reload(); await loadProducts(); }} onError={onError} /> : null}
      {receiveOrder ? <ReceiveOrderModal order={receiveOrder} data={data} close={() => setReceiveOrder(null)} apiCall={apiCall} reload={reload} onError={onError} /> : null}
    </section>
  );
}

function OrderProductModal({ product, data, close, apiCall, reload, onError }) {
  const [form, setForm] = useState({ supplier_id: "", quantity_type: "Unit", quantity: Math.max(1, Number(product.remaining_quantity || 0) <= 10 ? 10 : 1) });
  const [supplierQuery, setSupplierQuery] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (!form.supplier_id) {
      onError(new Error("Select a supplier before ordering."));
      return;
    }
    try {
      await apiCall("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: Number(form.supplier_id),
          product_id: product.id,
          quantity_type: form.quantity_type,
          quantity: Number(form.quantity || 0),
        }),
      });
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="simple-modal" onSubmit={submit}>
        <div className="modal-head"><h2>Order Product</h2><button type="button" onClick={close}><X /></button></div>
        <div className="simple-modal-body three">
          <Field label="Product" value={product.name} onChange={() => {}} disabled />
          <LookupField label="Supplier Name" required value={form.supplier_id} query={supplierQuery} onQueryChange={(value) => { setSupplierQuery(value); set("supplier_id", ""); }} onSelect={(supplier) => { set("supplier_id", supplier.id); setSupplierQuery(supplier.name); }} options={data.suppliers} placeholder="Supplier Name" />
          <GenericInput field={{ name: "quantity_type", label: "Type", type: "select", options: [{ id: "Unit", name: "Unit" }, { id: "Box", name: "Box" }] }} value={form.quantity_type} onChange={(v) => set("quantity_type", v)} />
          <Field label="Quantity" required type="number" value={form.quantity} onChange={(v) => set("quantity", v)} placeholder="Quantity" />
        </div>
        <div className="modal-actions"><span /><button className="primary">Order</button></div>
      </form>
    </div>
  );
}

function ReceiveOrderModal({ order, data, close, apiCall, reload, onError }) {
  const product = data.products.find((row) => Number(row.id) === Number(order.product_id));
  const [form, setForm] = useState(() => ({
    batch_no: `PO-${order.id}-${Date.now().toString().slice(-4)}`,
    quantity: order.quantity || 1,
    units_per_box: "",
    purchase_price: "",
    purchase_price_before_tax: "",
    sell_price: "",
    cost_price: "",
    total_cost: "",
    shelf_id: "",
    paid_amount: "",
    supplier_outstanding: "",
    supplier_invoice_no: "",
    expire_date: "",
    production_date: "",
    batch_purchase_date: today(),
    purchasing_method: "cash",
  }));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    try {
      await apiCall(`/api/purchase-orders/${order.id}/receive`, {
        method: "POST",
        body: JSON.stringify({
          ...cleanPayload(form),
          quantity: Number(form.quantity),
          units_per_box: form.units_per_box ? Number(form.units_per_box) : undefined,
          purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
          purchase_price_before_tax: form.purchase_price_before_tax ? Number(form.purchase_price_before_tax) : undefined,
          sell_price: form.sell_price ? Number(form.sell_price) : undefined,
          cost_price: form.cost_price ? Number(form.cost_price) : undefined,
          total_cost: form.total_cost ? Number(form.total_cost) : undefined,
          shelf_id: form.shelf_id ? Number(form.shelf_id) : undefined,
          paid_amount: form.paid_amount ? Number(form.paid_amount) : undefined,
          supplier_outstanding: form.supplier_outstanding ? Number(form.supplier_outstanding) : undefined,
        }),
      });
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="simple-modal" onSubmit={submit}>
        <div className="modal-head"><h2>Receive Order</h2><button type="button" onClick={close}><X /></button></div>
        <div className="simple-modal-body three">
          <Field label="Product" value={product?.name || order.product_name || ""} onChange={() => {}} disabled />
          <Field label="Batch No." required value={form.batch_no} onChange={(v) => set("batch_no", v)} placeholder="Enter batch no." />
          <Field label="Quantity" required type="number" value={form.quantity} onChange={(v) => set("quantity", v)} placeholder="Quantity" />
          <Field label="Units per box" type="number" value={form.units_per_box} onChange={(v) => set("units_per_box", v)} placeholder="Units per box" />
          <Field label="Purchase Price" type="number" value={form.purchase_price} onChange={(v) => set("purchase_price", v)} placeholder="Purchase Price" />
          <Field label="Stock Purchase Price Before Tax" type="number" value={form.purchase_price_before_tax} onChange={(v) => set("purchase_price_before_tax", v)} placeholder="Add Price" />
          <Field label="Cost Price" type="number" value={form.cost_price} onChange={(v) => set("cost_price", v)} placeholder="Cost Price" />
          <Field label="Sell Price" type="number" value={form.sell_price} onChange={(v) => set("sell_price", v)} placeholder="Sell Price" />
          <Field label="Total Cost" type="number" value={form.total_cost} onChange={(v) => set("total_cost", v)} placeholder="Total Cost" />
          <SelectField label="Shelf" value={form.shelf_id} onChange={(v) => set("shelf_id", v)} options={data.shelves} placeholder="Select Shelf" />
          <Field label="Paid Amount" type="number" value={form.paid_amount} onChange={(v) => set("paid_amount", v)} placeholder="Paid Amount" />
          <Field label="Supplier Outstanding" type="number" value={form.supplier_outstanding} onChange={(v) => set("supplier_outstanding", v)} placeholder="Supplier Outstanding" />
          <Field label="Supplier Invoice No." value={form.supplier_invoice_no} onChange={(v) => set("supplier_invoice_no", v)} placeholder="Invoice no." />
          <Field label="Expire Date" type="date" value={form.expire_date} onChange={(v) => set("expire_date", v)} />
          <Field label="Production Date" type="date" value={form.production_date} onChange={(v) => set("production_date", v)} />
          <Field label="Stock Purchase Date" type="date" value={form.batch_purchase_date} onChange={(v) => set("batch_purchase_date", v)} />
          <SelectField label="Purchasing Method" value={form.purchasing_method} onChange={(v) => set("purchasing_method", v)} options={[{ id: "cash", name: "Cash" }, { id: "card", name: "Card" }, { id: "bank", name: "Bank Transfer" }]} placeholder="Select Payment Method" />
        </div>
        <div className="modal-actions"><span /><button className="primary">Receive</button></div>
      </form>
    </div>
  );
}

const staffRoleOptions = [
  { id: "manager", name: "Manager" },
  { id: "pharmacist", name: "Pharmacist" },
  { id: "stock_manager", name: "Stock_manager" },
  { id: "technician", name: "Technician" },
  { id: "assistant", name: "Assistant" },
  { id: "intern", name: "Intern" },
  { id: "cashier", name: "Cashier" },
];
const staffGenderOptions = [{ id: "male", name: "Male" }, { id: "female", name: "Female" }];
const staffPermissionActions = ["view", "edit", "add", "delete"];
const staffPermissionRows = [
  ["pharmacy_component", "PharmacyComponent", ["view", "add", "delete"]],
  ["manufacturer", "Manufacturer", ["view", "add"]],
  ["category", "Category", ["view", "add"]],
  ["medicine_formula", "Medicine Formula", ["view", "add"]],
  ["sales_history", "Sales History", ["view"]],
  ["non_medical_product", "Non Medical Product", ["view", "edit", "add"]],
  ["daily_expense", "Daily Expense", ["view", "edit", "add", "delete"]],
  ["sales_return_history", "Sales Return History", ["view"]],
  ["audit_batch", "Audit Batch", ["add"]],
  ["expense_category", "Expense Category", ["view", "edit", "add"]],
  ["medical_product", "Medical Product", ["view", "edit", "add"]],
  ["pharmacy_dashboard", "Pharmacy Dashboard", ["view"]],
  ["demand_order", "Demand/Order", ["view", "edit", "add", "delete"]],
  ["supplier", "Supplier", ["view", "edit", "add"]],
  ["batch", "Batch", ["view", "edit", "add"]],
  ["new_sale", "New Sale", ["view", "add"]],
  ["sales_return", "Sales Return", ["add"]],
];
const defaultStaffPermissions = staffPermissionRows.reduce((lookup, [key, , actions]) => {
  lookup[key] = actions.reduce((row, action) => ({ ...row, [action]: false }), {});
  return lookup;
}, {});

function displayStaffRole(role) {
  return staffRoleOptions.find((option) => option.id === role)?.name || formatCell(role);
}

function normalizeStaffPermissions(source = {}) {
  const sourcePermissions = source || {};
  const legacyEnabled = {
    sales: ["new_sale", "sales_history", "sales_return", "sales_return_history"],
    inventory: ["batch", "medical_product", "non_medical_product", "supplier", "manufacturer", "category", "medicine_formula", "demand_order", "audit_batch"],
    expenses: ["daily_expense", "expense_category"],
    reports: ["pharmacy_dashboard"],
    staff_management: ["pharmacy_component"],
    settings: [],
  };
  return staffPermissionRows.reduce((lookup, [key, , actions]) => {
    const existing = sourcePermissions[key];
    const legacyValue = Object.entries(legacyEnabled).some(([legacyKey, moduleKeys]) => Boolean(sourcePermissions[legacyKey]) && moduleKeys.includes(key));
    lookup[key] = actions.reduce((row, action) => {
      row[action] = typeof existing === "object" && existing !== null ? Boolean(existing[action]) : Boolean(existing || legacyValue);
      return row;
    }, {});
    return lookup;
  }, {});
}

function staffPermissionsEnabled(permissions) {
  return staffPermissionRows.every(([key, , actions]) => actions.every((action) => Boolean(permissions?.[key]?.[action])));
}

function setAllStaffPermissions(checked) {
  return staffPermissionRows.reduce((lookup, [key, , actions]) => {
    lookup[key] = actions.reduce((row, action) => ({ ...row, [action]: checked }), {});
    return lookup;
  }, {});
}

function StaffPage({ data, apiCall, reload, onError }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const activeStaff = useMemo(() => data.staff.filter((row) => row.is_active !== false), [data.staff]);
  const loadStaff = useCallback(async () => {
    const params = new URLSearchParams({
      is_active: "true",
      skip: String((page - 1) * pageSize),
      limit: String(pageSize),
      paged: "true",
    });
    if (search.trim()) params.set("q", search.trim());
    const pageData = unpackPaged(await apiCall(`/api/staff?${params.toString()}`));
    setRows(pageData.items);
    setTotalRows(pageData.total);
  }, [apiCall, page, pageSize, search]);
  useEffect(() => {
    setRows(activeStaff.slice((page - 1) * pageSize, page * pageSize));
    setTotalRows(activeStaff.length);
  }, [activeStaff, page, pageSize]);
  useEffect(() => {
    const timer = setTimeout(() => {
      loadStaff().catch((error) => onError(error));
    }, 150);
    return () => clearTimeout(timer);
  }, [loadStaff, onError]);
  async function blockStaff(row) {
    if (!window.confirm(`Block ${row.name}?`)) return;
    try {
      await apiCall(`/api/staff/${row.id}`, { method: "DELETE" });
      await reload();
      await loadStaff();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <section className="list-page">
      <div className="list-head"><div className="batch-toolbar"><label><Search size={18} /><input placeholder="Search Name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label></div><button className="primary" onClick={() => setModal({ row: null })}>Add Staff</button></div>
      <DataTable columns={[["name", "Name"], ["role", "Role"], ["phone", "Phone #"], ["address", "Address"], ["email", "Email"], ["actions", "Actions"]]} rows={rows} render={(row, key) => {
        if (key === "actions") return <StaffActionButtons row={row} onView={() => setModal({ type: "view", row })} onEdit={() => setModal({ type: "edit", row })} onBlock={() => blockStaff(row)} onPin={() => setModal({ type: "pin", row })} onPermissions={() => setModal({ type: "permissions", row })} />;
        if (key === "name") return <span className="staff-name-cell"><UserRound size={15} /><span>{formatCell(row[key])}</span></span>;
        if (key === "role") return displayStaffRole(row[key]);
        return formatCell(row[key]);
      }} />
      {totalRows > pageSize ? <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} /> : null}
      {modal && (!modal.type || modal.type === "edit") ? <StaffModal row={modal.row} close={() => setModal(null)} apiCall={apiCall} reload={reload} onError={onError} /> : null}
      {modal?.type === "view" ? <StaffViewModal row={modal.row} close={() => setModal(null)} /> : null}
      {modal?.type === "pin" ? <StaffPinModal row={modal.row} close={() => setModal(null)} apiCall={apiCall} reload={async () => { await reload(); await loadStaff(); }} onError={onError} /> : null}
      {modal?.type === "permissions" ? <StaffPermissionsModal row={modal.row} close={() => setModal(null)} apiCall={apiCall} reload={async () => { await reload(); await loadStaff(); }} onError={onError} /> : null}
    </section>
  );
}

function StaffActionButtons({ onView, onEdit, onBlock, onPin, onPermissions }) {
  return (
    <div className="icon-actions">
      <button className="icon-action" type="button" title="View" aria-label="View" onClick={onView}><Eye size={18} /></button>
      <button className="icon-action" type="button" title="Edit" aria-label="Edit" onClick={onEdit}><Pencil size={18} /></button>
      <button className="icon-action danger-icon" type="button" title="Block" aria-label="Block" onClick={onBlock}><X size={18} /></button>
      <button className="icon-action" type="button" title="Edit Pin" aria-label="Edit Pin" onClick={onPin}><KeyRound size={18} /></button>
      <button className="icon-action" type="button" title="Edit Permissions" aria-label="Edit Permissions" onClick={onPermissions}><ShieldCheck size={18} /></button>
    </div>
  );
}

function StaffModal({ row, close, apiCall, reload, onError }) {
  const editing = !!row;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({
    role: "",
    staff_pin: "",
    gender: "",
    sales_pin: "",
    ...(row || {}),
    permissions: normalizeStaffPermissions(row?.permissions),
  }));
  const [roleQuery, setRoleQuery] = useState(() => row?.role ? displayStaffRole(row.role) : "");
  const [genderQuery, setGenderQuery] = useState(() => staffGenderOptions.find((option) => option.id === row?.gender)?.name || "");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setPermission = (moduleKey, action, value) => setForm((current) => ({
    ...current,
    permissions: {
      ...(current.permissions || {}),
      [moduleKey]: { ...(current.permissions?.[moduleKey] || {}), [action]: value },
    },
  }));
  const setAllPermissions = (value) => setForm((current) => ({ ...current, permissions: setAllStaffPermissions(value) }));
  function selectRole(option) {
    set("role", option.id);
    setRoleQuery(option.name);
  }
  function selectGender(option) {
    set("gender", option.id);
    setGenderQuery(option.name);
  }
  function setStaffPinDigit(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setForm((current) => {
      const digits = String(current.staff_pin || "").padEnd(6, " ").split("");
      digits[index] = digit || " ";
      return { ...current, staff_pin: digits.join("").replace(/\s/g, "") };
    });
  }
  function nextStep(event) {
    event.preventDefault();
    if (step === 2 && String(form.staff_pin || "").length !== 6) {
      onError(new Error("Create a 6 digit pin for the staff member."));
      return;
    }
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }
    submit(event);
  }
  async function submit(event) {
    event.preventDefault();
    try {
      const { staff_pin, ...rawPayload } = form;
      const matchedRole = staffRoleOptions.find((option) => option.name.toLowerCase() === roleQuery.trim().toLowerCase() || option.id === roleQuery.trim());
      const matchedGender = staffGenderOptions.find((option) => option.name.toLowerCase() === genderQuery.trim().toLowerCase() || option.id === genderQuery.trim());
      rawPayload.role = rawPayload.role || matchedRole?.id;
      rawPayload.gender = rawPayload.gender || matchedGender?.id;
      const payload = cleanPayload(rawPayload);
      if (staff_pin) payload.password = staff_pin;
      await apiCall(editing ? `/api/staff/${row.id}` : "/api/staff", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="simple-modal" onSubmit={nextStep}>
        <div className="modal-head"><h2>{editing ? "Edit Staff" : "Add Staff"}</h2><button type="button" onClick={close}><X /></button></div>
        <div className="stepper">
          <span className={step === 1 ? "active" : ""}>01 Add Staff</span>
          <span className={step === 2 ? "active" : ""}>02 Assign Pin</span>
          <span className={step === 3 ? "active" : ""}>03 User Permissions</span>
        </div>
        {step === 1 ? <div className="simple-modal-body three">
          <Field label="Name" required value={form.name || ""} onChange={(v) => set("name", v)} placeholder="Enter Name" />
          <LookupField label="Role" required value={form.role || ""} query={roleQuery} onQueryChange={(value) => { setRoleQuery(value); set("role", ""); }} onSelect={selectRole} options={staffRoleOptions} placeholder="Select an option" />
          <Field label="Email" type="email" value={form.email || ""} onChange={(v) => set("email", v)} placeholder="Enter Email" />
          <Field label="Number" value={form.phone || ""} onChange={(v) => set("phone", v)} placeholder="03xx xxxxxxxxx" />
          <Field label="Address" value={form.address || ""} onChange={(v) => set("address", v)} placeholder="Enter Address" />
          <LookupField label="Gender" value={form.gender || ""} query={genderQuery} onQueryChange={(value) => { setGenderQuery(value); set("gender", ""); }} onSelect={selectGender} options={staffGenderOptions} placeholder="Select an option" />
          <Field label="Sales PIN (3 digits)" value={form.sales_pin || ""} onChange={(v) => set("sales_pin", v.replace(/\D/g, "").slice(0, 8))} placeholder={editing && form.has_sales_pin ? "PIN already assigned" : "Enter 3 digit pin"} />
        </div> : null}
        {step === 2 ? <div className="pin-step">
          <p>Create 6 Digit Pin for your staff member</p>
          <div className="pin-digit-row">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                inputMode="numeric"
                maxLength={1}
                value={String(form.staff_pin || "")[index] || ""}
                onChange={(event) => setStaffPinDigit(index, event.target.value)}
              />
            ))}
          </div>
        </div> : null}
        {step === 3 ? <StaffPermissionMatrix permissions={form.permissions} onChange={setPermission} onSetAll={setAllPermissions} /> : null}
        <div className="modal-actions">
          {step === 3 ? <button className="outline" type="button" onClick={() => setStep(2)}>Back</button> : <span />}
          <button className="primary">{step === 3 ? (editing ? "Save" : "Done") : "Next"}</button>
        </div>
      </form>
    </div>
  );
}

function StaffViewModal({ row, close }) {
  const permissions = normalizeStaffPermissions(row?.permissions);
  return (
    <div className="modal-backdrop">
      <div className="simple-modal">
        <div className="modal-head"><h2>Staff Details</h2><button type="button" onClick={close}><X /></button></div>
        <div className="detail-grid">
          <span>Name</span><strong>{formatCell(row.name)}</strong>
          <span>Role</span><strong>{displayStaffRole(row.role)}</strong>
          <span>Phone #</span><strong>{formatCell(row.phone)}</strong>
          <span>Address</span><strong>{formatCell(row.address)}</strong>
          <span>Email</span><strong>{formatCell(row.email)}</strong>
          <span>Gender</span><strong>{formatCell(row.gender)}</strong>
          <span>Sales PIN</span><strong>{row.has_sales_pin ? "Assigned" : "-"}</strong>
          <span>Permissions</span><strong>{formatStaffPermissions(permissions)}</strong>
        </div>
        <div className="modal-actions"><span /><button className="primary" type="button" onClick={close}>Close</button></div>
      </div>
    </div>
  );
}

function StaffPinModal({ row, close, apiCall, reload, onError }) {
  const [pin, setPin] = useState("");
  async function submit(event) {
    event.preventDefault();
    try {
      await apiCall(`/api/staff/${row.id}`, { method: "PUT", body: JSON.stringify({ sales_pin: pin }) });
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="simple-modal" onSubmit={submit}>
        <div className="modal-head"><h2>Edit Pin</h2><button type="button" onClick={close}><X /></button></div>
        <div className="simple-modal-body">
          <Field label="Sales PIN (3 digits)" required value={pin} onChange={(value) => setPin(value.replace(/\D/g, "").slice(0, 8))} placeholder={row.has_sales_pin ? "PIN already assigned" : "Enter 3 digit pin"} />
        </div>
        <div className="modal-actions"><span /><button className="primary">Save</button></div>
      </form>
    </div>
  );
}

function StaffPermissionsModal({ row, close, apiCall, reload, onError }) {
  const [permissions, setPermissions] = useState(() => normalizeStaffPermissions(row?.permissions));
  const setPermission = (moduleKey, action, value) => setPermissions((current) => ({
    ...current,
    [moduleKey]: { ...(current[moduleKey] || {}), [action]: value },
  }));
  const setAllPermissions = (value) => setPermissions(setAllStaffPermissions(value));
  async function submit(event) {
    event.preventDefault();
    try {
      await apiCall(`/api/staff/${row.id}`, { method: "PUT", body: JSON.stringify({ permissions }) });
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="simple-modal" onSubmit={submit}>
        <div className="modal-head"><h2>Edit Permissions</h2><button type="button" onClick={close}><X /></button></div>
        <StaffPermissionMatrix permissions={permissions} onChange={setPermission} onSetAll={setAllPermissions} />
        <div className="modal-actions"><span /><button className="primary">Done</button></div>
      </form>
    </div>
  );
}

function StaffPermissionMatrix({ permissions, onChange, onSetAll }) {
  const allSelected = staffPermissionsEnabled(permissions);
  return (
    <div className="staff-permissions-panel">
      <label className="select-all-permissions">
        <span>Select All Permissions</span>
        <input type="checkbox" checked={allSelected} onChange={(event) => onSetAll(event.target.checked)} />
      </label>
      <div className="staff-permissions-table-wrap">
        <table className="staff-permissions-table">
          <thead>
            <tr>
              <th>Permissions</th>
              <th>View</th>
              <th>Edit</th>
              <th>Add</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {staffPermissionRows.map(([moduleKey, label, actions]) => (
              <tr key={moduleKey}>
                <td>{label}</td>
                {staffPermissionActions.map((action) => (
                  <td key={action}>
                    {actions.includes(action) ? (
                      <input
                        type="checkbox"
                        checked={Boolean(permissions?.[moduleKey]?.[action])}
                        onChange={(event) => onChange(moduleKey, action, event.target.checked)}
                      />
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatStaffPermissions(permissions) {
  const enabledRows = staffPermissionRows
    .map(([key, label, actions]) => {
      const enabledActions = actions.filter((action) => Boolean(permissions?.[key]?.[action]));
      return enabledActions.length ? `${label}: ${enabledActions.map((action) => action[0].toUpperCase() + action.slice(1)).join(", ")}` : null;
    })
    .filter(Boolean);
  return enabledRows.join("; ") || "-";
}

function ShiftPage({ data, apiCall, reload, onError }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const loadShifts = useCallback(async () => {
    const params = new URLSearchParams({
      skip: String((page - 1) * pageSize),
      limit: String(pageSize),
      paged: "true",
    });
    if (search.trim()) params.set("q", search.trim());
    const pageData = unpackPaged(await apiCall(`/api/shifts?${params.toString()}`));
    setRows(pageData.items);
    setTotalRows(pageData.total);
  }, [apiCall, page, pageSize, search]);
  useEffect(() => {
    setRows(data.shifts.slice((page - 1) * pageSize, page * pageSize));
    setTotalRows(data.shifts.length);
  }, [data.shifts, page, pageSize]);
  useEffect(() => {
    const timer = setTimeout(() => {
      loadShifts().catch((error) => onError(error));
    }, 150);
    return () => clearTimeout(timer);
  }, [loadShifts, onError]);
  async function deleteShift(row) {
    if (!window.confirm("Delete shift?")) return;
    try {
      await apiCall(`/api/shifts/${row.id}`, { method: "DELETE" });
      await reload();
      await loadShifts();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <section className="list-page">
      <div className="list-head"><div className="batch-toolbar"><label><Search size={18} /><input placeholder="Search Name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label></div><button className="primary" onClick={() => setModal({ row: null })}>Add Shift</button><button className="count-button" type="button">{totalRows}</button></div>
      {rows.length ? <div className="shift-card-grid">{rows.map((row) => (
        <article className="shift-card" key={row.id}>
          <div><strong>{row.staff_name || nameById(data.staff, row.staff_id)}</strong><span>{row.shift_type}</span></div>
          <p>{formatAmPmTime(row.start_time, row.start_period)} - {formatAmPmTime(row.end_time, row.end_period)}</p>
          <small>Off Days: {row.off_days || row.notes || "-"}</small>
          <small>Date: {row.date}</small>
          <ActionButtons onEdit={() => setModal({ row })} onDelete={() => deleteShift(row)} />
        </article>
      ))}</div> : <div className="empty-page-state"><p className="empty">No Data Found</p></div>}
      {totalRows ? <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} /> : null}
      {modal ? <ShiftModal row={modal.row} data={data} close={() => setModal(null)} apiCall={apiCall} reload={reload} onError={onError} /> : null}
    </section>
  );
}

function ShiftModal({ row, data, close, apiCall, reload, onError }) {
  const editing = !!row;
  const shiftTypeOptions = [{ id: "Morning", name: "Morning" }, { id: "Evening", name: "Evening" }, { id: "Night", name: "Night" }];
  const initialStaff = data.staff.find((staff) => Number(staff.id) === Number(row?.staff_id));
  const [form, setForm] = useState(() => ({ staff_id: "", shift_type: "", date: today(), start_time: "", end_time: "", start_period: "AM", end_period: "AM", off_days: "", ...(row || {}) }));
  const [staffQuery, setStaffQuery] = useState(initialStaff?.name || row?.staff_name || "");
  const [shiftTypeQuery, setShiftTypeQuery] = useState(row?.shift_type || "");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  function selectShiftStaff(staff) {
    set("staff_id", staff.id);
    setStaffQuery(staff.name);
  }
  function selectShiftType(option) {
    set("shift_type", option.id);
    setShiftTypeQuery(option.name);
  }
  function period(value, fallback = "AM") {
    const normalized = String(value || fallback).trim().toUpperCase();
    return normalized === "PM" ? "PM" : "AM";
  }
  async function submit(event) {
    event.preventDefault();
    const matchedStaff = data.staff.find((staff) => staff.name.toLowerCase() === staffQuery.trim().toLowerCase());
    const staffId = form.staff_id || matchedStaff?.id;
    const shiftType = form.shift_type || shiftTypeQuery.trim();
    const startTime = normalizeTimeForApi(form.start_time);
    const endTime = normalizeTimeForApi(form.end_time);
    if (!staffId || !shiftType || !startTime || !endTime) {
      onError(new Error("Complete staff, shift type, start time, and end time."));
      return;
    }
    try {
      await apiCall(editing ? `/api/shifts/${row.id}` : "/api/shifts", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...cleanPayload(form),
          staff_id: Number(staffId),
          shift_type: shiftType,
          date: form.date || today(),
          start_time: startTime,
          end_time: endTime,
          start_period: period(form.start_period),
          end_period: period(form.end_period),
        }),
      });
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="simple-modal" onSubmit={submit}>
        <div className="modal-head"><h2>{editing ? "Edit Shift" : "Assign Shift"}</h2><button type="button" onClick={close}><X /></button></div>
        <div className="simple-modal-body three">
          <LookupField label="Select Staff Member *Required" required value={form.staff_id || ""} query={staffQuery} onQueryChange={(value) => { setStaffQuery(value); set("staff_id", ""); }} onSelect={selectShiftStaff} options={data.staff} placeholder="Staff Member" />
          <LookupField label="Select Shift Type *Required" required value={form.shift_type || ""} query={shiftTypeQuery} onQueryChange={(value) => { setShiftTypeQuery(value); set("shift_type", ""); }} onSelect={selectShiftType} options={shiftTypeOptions} placeholder="Shift Type" />
          <Field label="Select Off Days" value={form.off_days || ""} onChange={(v) => set("off_days", v)} placeholder="Off Days" />
          <div className="time-period-field"><Field label="Start Time *Required" value={String(form.start_time || "").slice(0, 5)} onChange={(v) => set("start_time", v)} placeholder="Start Time" /><Field hideLabel label="Start Period" value={period(form.start_period)} onChange={(v) => set("start_period", v)} /></div>
          <div className="time-period-field"><Field label="End Time *Required" value={String(form.end_time || "").slice(0, 5)} onChange={(v) => set("end_time", v)} placeholder="End Time" /><Field hideLabel label="End Period" value={period(form.end_period)} onChange={(v) => set("end_period", v)} /></div>
        </div>
        <div className="modal-actions"><span /><button className="primary">{editing ? "Save" : "Add"}</button></div>
      </form>
    </div>
  );
}

function ExpensePage({ data, apiCall, reload, onError }) {
  const [modal, setModal] = useState(null);
  const [dateMode, setDateMode] = useState("single");
  const [date, setDate] = useState(today());
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(data.expenses);
  const [totalRows, setTotalRows] = useState(data.expenses.length);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  function expenseParams(options = {}) {
    const { limit, skip, paged = false } = options;
    const params = new URLSearchParams();
    if (limit) params.set("limit", limit);
    if (skip != null) params.set("skip", String(skip));
    if (paged) params.set("paged", "true");
    if (dateMode === "range") {
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
    } else if (date) {
      params.set("date_from", date);
      params.set("date_to", date);
    }
    if (search.trim()) params.set("q", search.trim());
    return params;
  }
  useEffect(() => { setRows(data.expenses); setTotalRows(data.expenses.length); }, [data.expenses]);
  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = expenseParams({ skip: (page - 1) * pageSize, limit: pageSize, paged: true });
      try {
        const pageData = unpackPaged(await apiCall(`/api/expenses?${params.toString()}`));
        setRows(pageData.items);
        setTotalRows(pageData.total);
      } catch (error) {
        onError(error);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [dateMode, date, dateFrom, dateTo, search, page, pageSize, apiCall, onError]);
  async function deleteExpense(row) {
    if (!window.confirm(`Delete expense ${row.name}?`)) return;
    try {
      await apiCall(`/api/expenses/${row.id}`, { method: "DELETE" });
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  async function downloadExpense(row) {
    try {
      const { token } = getStoredSession();
      const response = await fetch(`/api/expenses/${row.id}/download-pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(response.status === 401 ? "Session expired. Please sign in again." : await response.text());
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `expense-${row.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError(error);
    }
  }
  async function downloadExpenseReport() {
    try {
      const { token } = getStoredSession();
      const response = await fetch(`/api/expenses/download-pdf?${expenseParams().toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(response.status === 401 ? "Session expired. Please sign in again." : await response.text());
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "expenses.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError(error);
    }
  }
  return (
    <section className="list-page">
      <div className="tabs"><label><input type="radio" checked={dateMode === "single"} onChange={() => { setDateMode("single"); setPage(1); }} /> Date</label><label><input type="radio" checked={dateMode === "range"} onChange={() => { setDateMode("range"); setPage(1); }} /> Date Range</label></div>
      <div className="list-head report-filters">{dateMode === "range" ? <>
        <label><span className="field-title">From Date</span><input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>
        <label><span className="field-title">To Date</span><input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /></label>
      </> : <label><span className="field-title">Date</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} /></label>}<button className="outline" type="button" onClick={downloadExpenseReport}>Download Expense PDF</button><button className="primary" onClick={() => setModal({ row: null })}>Add Expense</button></div>
      <DataTable columns={[["date", "Date"], ["name", "Name"], ["expense_category_id", "Expense Category"], ["expense_amount", "Expense Amount"], ["actions", "Actions"]]} rows={rows} emptyText="No Data found!" render={(row, key) => key === "date" ? formatTableDate(row[key]) : key === "expense_category_id" ? (row.expense_category_name || nameById(data.expenseCategories, row[key])) : key === "expense_amount" ? money(row[key]) : key === "actions" ? <ActionButtons onDownload={() => downloadExpense(row)} onEdit={() => setModal({ row })} onDelete={() => deleteExpense(row)} /> : formatCell(row[key])} />
      {totalRows ? <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} /> : null}
      {modal ? <ExpenseModal row={modal.row} data={data} close={() => setModal(null)} apiCall={apiCall} reload={reload} onError={onError} /> : null}
    </section>
  );
}

function ExpenseModal({ row, data, close, apiCall, reload, onError }) {
  const editing = !!row;
  const initialCategory = data.expenseCategories.find((category) => Number(category.id) === Number(row?.expense_category_id));
  const [form, setForm] = useState(() => ({ date: today(), ...(row || {}) }));
  const [categoryQuery, setCategoryQuery] = useState(initialCategory?.name || row?.expense_category_name || "");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  function selectExpenseCategory(category) {
    set("expense_category_id", category.id);
    setCategoryQuery(category.name);
  }
  async function submit(event) {
    event.preventDefault();
    const matchedCategory = data.expenseCategories.find((category) => category.name.toLowerCase() === categoryQuery.trim().toLowerCase());
    const categoryId = form.expense_category_id || matchedCategory?.id;
    if (!categoryId) {
      onError(new Error("Select expense category."));
      return;
    }
    try {
      await apiCall(editing ? `/api/expenses/${row.id}` : "/api/expenses", { method: editing ? "PUT" : "POST", body: JSON.stringify({ ...cleanPayload(form), date: normalizeDateForApi(form.date), expense_category_id: Number(categoryId), expense_amount: Number(form.expense_amount) }) });
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="simple-modal" onSubmit={submit}>
        <div className="modal-head"><h2>{editing ? "Edit Expense" : "Add Expense"}</h2><button type="button" onClick={close}><X /></button></div>
        <div className="simple-modal-body">
          <Field label="Expense Name" required value={form.name || ""} onChange={(v) => set("name", v)} placeholder="Enter Expense Name" />
          <Field label="Date" type="tel" value={formatSlashDate(form.date || today())} onChange={(v) => set("date", v)} placeholder="yyyy-mm-dd" />
          <LookupField label="Expense Category *" required value={form.expense_category_id || ""} query={categoryQuery} onQueryChange={(value) => { setCategoryQuery(value); set("expense_category_id", ""); }} onSelect={selectExpenseCategory} options={data.expenseCategories} placeholder="Select Expense" />
          <Field label="Amount" required value={form.expense_amount || ""} onChange={(v) => set("expense_amount", v)} placeholder="e.g. 1500" />
          <TextareaField label="Description" value={form.notes || ""} onChange={(v) => set("notes", v)} placeholder="Enter Description..." />
        </div>
        <div className="modal-actions"><span /><button className="primary">{editing ? "Save" : "Add"}</button></div>
      </form>
    </div>
  );
}

function ReturnPolicyPage({ data, apiCall, reload, onError }) {
  const [modal, setModal] = useState(null);
  async function deletePolicy(row) {
    if (!window.confirm("Delete return policy?")) return;
    try {
      await apiCall(`/api/return-policies/${row.id}`, { method: "DELETE" });
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  async function deleteNote(row) {
    if (!window.confirm("Delete return note?")) return;
    try {
      await apiCall(`/api/return-notes/${row.id}`, { method: "DELETE" });
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <section className="list-page">
      <Panel title="Products Return Policy">
        <div className="panel-actions"><button className="primary" onClick={() => setModal({ type: "policy", row: null })}>Add New Policy</button></div>
        <DataTable columns={[["description", "Policy Description"], ["actions", "Actions"]]} rows={data.returnPolicies} render={(row, key) => key === "actions" ? <ActionButtons onEdit={() => setModal({ type: "policy", row })} onDelete={() => deletePolicy(row)} /> : formatCell(row[key])} />
      </Panel>
      <Panel title="Additional Notes/Instructions">
        <div className="panel-actions"><button className="primary" onClick={() => setModal({ type: "note", row: null })}>Add New Instructions</button></div>
        <DataTable columns={[["title", "Title"], ["description", "Description"], ["actions", "Actions"]]} rows={data.returnNotes} render={(row, key) => key === "actions" ? <ActionButtons onEdit={() => setModal({ type: "note", row })} onDelete={() => deleteNote(row)} /> : formatCell(row[key])} />
      </Panel>
      {modal ? <CrudModal config={modal.type === "policy" ? { title: "Policy", addLabel: "Add Policy", addSubmitLabel: "Save", endpoint: "/api/return-policies", fields: [{ name: "description", label: "Policy Description", type: "textarea", placeholder: "Description", required: true }] } : { title: "Instruction", addLabel: "Add Instructions", addSubmitLabel: "Save", endpoint: "/api/return-notes", fields: [{ name: "title", label: "Title", type: "textarea", placeholder: "Title", required: true }, { name: "description", label: "Description", type: "textarea", placeholder: "Description" }] }} row={modal.row} close={() => setModal(null)} apiCall={apiCall} reload={reload} onError={onError} /> : null}
    </section>
  );
}

function ChangePasswordPage({ data, apiCall, onError, setNotice }) {
  const [mode, setMode] = useState("staff");
  const [form, setForm] = useState({ current_password: "", new_password: "", verify: "" });
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (form.new_password !== form.verify) {
      onError(new Error("New password and verification do not match."));
      return;
    }
    try {
      await apiCall("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password }) });
      setForm({ current_password: "", new_password: "", verify: "" });
      setNotice("Password changed.");
    } catch (error) {
      onError(error);
    }
  }
  return (
    <section className="form-page">
      <div className="tabs">
        <label><input type="radio" checked={mode === "staff"} onChange={() => setMode("staff")} /> Staff</label>
        <label><input type="radio" checked={mode === "admin"} onChange={() => setMode("admin")} /> Admin</label>
      </div>
      <form className="settings-form" onSubmit={submit}>
        {mode === "staff" ? <h2>Change Password for Staff</h2> : null}
        <h2>Change Your Account Password</h2>
        <PasswordField label="Current Password" value={form.current_password} onChange={(v) => set("current_password", v)} placeholder="Enter Current Password" />
        <PasswordField label="New Password" value={form.new_password} onChange={(v) => set("new_password", v)} placeholder="Enter New Password" />
        <PasswordField label="Verify Password" value={form.verify} onChange={(v) => set("verify", v)} placeholder="Verify New Password" />
        <button className="primary">✓ Save</button>
      </form>
    </section>
  );
}

function SalesHistoryPage({ data, apiCall, onError }) {
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [summary, setSummary] = useState(null);
  const [detailSale, setDetailSale] = useState(null);
  const salesParamsForFilters = useCallback((filters, overrides = {}) => {
    const pageSize = filters.pageSize || 50;
    const params = new URLSearchParams({
      skip: String(overrides.skip ?? (((filters.page || 1) - 1) * pageSize)),
      limit: String(overrides.limit ?? pageSize),
    });
    if (filters.dateMode === "range") {
      if (filters.dateFrom) params.set("date_from", filters.dateFrom);
      if (filters.dateTo) params.set("date_to", filters.dateTo);
    } else if (filters.date) {
      params.set("date_from", filters.date);
      params.set("date_to", filters.date);
    }
    const timeFrom = normalizeTimeForApi(filters.timeFrom);
    const timeTo = normalizeTimeForApi(filters.timeTo);
    if (timeFrom) params.set("time_from", `${timeFrom}:00`);
    if (timeTo) params.set("time_to", `${timeTo}:00`);
    if (filters.search?.trim()) params.set("q", filters.search.trim());
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    return params;
  }, []);
  const loadSales = useCallback(async (filters) => {
    if (!apiCall) return;
    const params = salesParamsForFilters(filters);
    params.set("paged", "true");
    try {
      const summaryParams = new URLSearchParams(params);
      summaryParams.delete("skip");
      summaryParams.delete("limit");
      summaryParams.delete("paged");
      const [pageRows, totals] = await Promise.all([
        apiCall(`/api/sales?${params.toString()}`),
        apiCall(`/api/reports/sales-summary?${summaryParams.toString()}`),
      ]);
      const page = unpackPaged(pageRows);
      setRows(page.items);
      setTotalRows(page.total);
      setSummary(totals);
    } catch (error) {
      onError(error);
    }
  }, [apiCall, onError, salesParamsForFilters]);
  const loadPrintableSales = useCallback(async (filters) => {
    if (!apiCall) return rows;
    const params = salesParamsForFilters(filters, { skip: 0, limit: Math.max(totalRows || 0, filters.pageSize || 50, 5000) });
    params.set("paged", "true");
    const result = await apiCall(`/api/sales?${params.toString()}`);
    return unpackPaged(result).items;
  }, [apiCall, rows, salesParamsForFilters, totalRows]);
  async function openSaleDetails(row) {
    try {
      setDetailSale(await apiCall(`/api/sales/${row.id}`));
    } catch (error) {
      onError(error);
    }
  }
  const columns = [
    ["invoice_number", "Invoice Number"],
    ["date", "Date"],
    ["time", "Time"],
    ["total_amount", "Total Amount(RS.)"],
    ["discount_percent", "Discount(%)"],
    ["discount_amount", "Discount Amount"],
    ["total_payable", "Total Payable"],
    ["paid", "Paid"],
    ["due", "Due(s)"],
    ["change_returned", "Change Returned"],
    ["actions", "Action"],
  ];
  return (
    <>
      <ReportPage
        title="Sales History"
        radios={["Date", "Date Range"]}
        inputs={["Search by Invoice ID/Medicine Name..."]}
        rows={rows}
        columns={columns}
        salesSummary
        summaryTotals={summary}
        totalRows={totalRows}
        showTimeFilters
        onFiltersChange={loadSales}
        onPrintRows={loadPrintableSales}
        printFormatValue={(row, key) => key === "time" ? formatHistoryTime(row[key]) : formatSalesHistoryCell(row, key)}
        render={(row, key) => key === "actions" ? (
          <div className="invoice-actions">
            <button className="icon-action" type="button" title="view" aria-label="view" onClick={() => openSaleDetails(row)}><Eye size={18} /></button>
          </div>
        ) : key === "time" ? formatHistoryTime(row[key]) : formatSalesHistoryCell(row, key)}
      />
      {detailSale ? <SalesHistoryDetailsModal sale={detailSale} data={data} close={() => setDetailSale(null)} /> : null}
    </>
  );
}

function ReturnHistoryPage({ data, apiCall, onError }) {
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [summary, setSummary] = useState(null);
  const [detailSale, setDetailSale] = useState(null);
  const loadReturns = useCallback(async (filters) => {
    if (!apiCall) return;
    const pageSize = filters.pageSize || 50;
    const params = new URLSearchParams({ skip: String(((filters.page || 1) - 1) * pageSize), limit: String(pageSize), paged: "true" });
    if (filters.dateMode === "range") {
      if (filters.dateFrom) params.set("date_from", filters.dateFrom);
      if (filters.dateTo) params.set("date_to", filters.dateTo);
    } else if (filters.date) {
      params.set("date_from", filters.date);
      params.set("date_to", filters.date);
    }
    if (filters.search?.trim()) params.set("q", filters.search.trim());
    try {
      const summaryParams = new URLSearchParams(params);
      summaryParams.delete("skip");
      summaryParams.delete("limit");
      summaryParams.delete("paged");
      const [pageRows, totals] = await Promise.all([
        apiCall(`/api/reports/return-history?${params.toString()}`),
        apiCall(`/api/reports/returns-summary?${summaryParams.toString()}`),
      ]);
      const page = unpackPaged(pageRows);
      setRows(page.items);
      setTotalRows(page.total);
      setSummary(totals);
    } catch (error) {
      onError(error);
    }
  }, [apiCall, onError]);
  async function openReturnDetails(row) {
    try {
      setDetailSale(await apiCall(`/api/sales/${row.sale_id}`));
    } catch (error) {
      onError(error);
    }
  }
  const columns = [
    ["invoice_number", "Invoice Number"],
    ["date", "Date"],
    ["time", "Time"],
    ["total_amount", "Total Amount(RS.)"],
    ["discount_percent", "Discount(%)"],
    ["discount_amount", "Discount Amount"],
    ["total_payable", "Total Payable"],
    ["paid", "Paid"],
    ["due", "Due(s)"],
    ["change_returned", "Change Returned"],
    ["actions", "Action"],
  ];
  return (
    <>
      <ReportPage
        title="Return History"
        radios={["Select Date", "Select Date Range"]}
        inputs={["Search by Invoice ID..."]}
        rows={rows}
        columns={columns}
        returnSummary
        summaryTotals={summary}
        totalRows={totalRows}
        onFiltersChange={loadReturns}
        render={(row, key) => {
          if (key === "invoice_number") return <span>{row.invoice_number}<br /><small>Return Invoice</small></span>;
          if (key === "time") return formatHistoryTime(row[key]);
          if (["total_amount", "discount_percent", "discount_amount", "total_payable", "paid", "due", "change_returned"].includes(key)) return money(row[key]);
          if (key === "actions") return <button className="icon-action" type="button" title="view" aria-label="view" onClick={() => openReturnDetails(row)}><Eye size={18} /></button>;
          return formatCell(row[key]);
        }}
      />
      {detailSale ? <SalesHistoryDetailsModal sale={detailSale} data={data} close={() => setDetailSale(null)} /> : null}
    </>
  );
}

function ProductSalesHistoryPage({ data, apiCall, onError }) {
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyFilters, setHistoryFilters] = useState(null);
  const [detailSale, setDetailSale] = useState(null);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const loadProductSales = useCallback(async (filters) => {
    if (!apiCall) return;
    const pageSize = filters.pageSize || 50;
    const params = new URLSearchParams({ skip: String(((filters.page || 1) - 1) * pageSize), limit: String(pageSize), paged: "true" });
    if (filters.dateMode === "range") {
      if (filters.dateFrom) params.set("date_from", filters.dateFrom);
      if (filters.dateTo) params.set("date_to", filters.dateTo);
    } else if (filters.date) {
      params.set("date_from", filters.date);
      params.set("date_to", filters.date);
    }
    if (filters.search?.trim()) params.set("q", filters.search.trim());
    try {
      const page = unpackPaged(await apiCall(`/api/reports/product-sales?${params.toString()}`));
      setRows(page.items);
      setTotalRows(page.total);
    } catch (error) {
      onError(error);
    }
  }, [apiCall, onError]);
  function openProductHistory(row, filters) {
    setHistoryProduct(row);
    setHistoryFilters(filters);
  }
  async function openSaleDetails(row) {
    try {
      setDetailSale(await apiCall(`/api/sales/${row.sale_id}`));
    } catch (error) {
      onError(error);
    }
  }
  async function printSale(row) {
    try {
      setInvoiceSale(await apiCall(`/api/sales/${row.sale_id}`));
    } catch (error) {
      onError(error);
    }
  }
  return (
    <>
      <ReportPage
        title="Product Sales History"
        radios={["Select Date", "Select Date Range"]}
        inputs={["Search..."]}
        rows={rows}
        columns={[["product_name", "Product Name"], ["dose", "Dose"], ["generic_name", "Generic Name"], ["sold_quantity", "Sold Quantity"], ["actions", "Action"]]}
        totalRows={totalRows}
        onFiltersChange={loadProductSales}
        render={(row, key, filters) => key === "actions" ? <button className="text-button" type="button" onClick={() => openProductHistory(row, filters)}>View Product History</button> : formatCell(row[key])}
      />
      {historyProduct ? <ProductHistoryModal product={historyProduct} filters={historyFilters} apiCall={apiCall} onError={onError} close={() => setHistoryProduct(null)} onView={openSaleDetails} onPrint={printSale} /> : null}
      {detailSale ? <SalesHistoryDetailsModal sale={detailSale} data={data} close={() => setDetailSale(null)} /> : null}
      {invoiceSale ? <InvoiceModal sale={invoiceSale} data={data} close={() => setInvoiceSale(null)} /> : null}
    </>
  );
}

function CustomerHistoryPage({ data, apiCall, onError }) {
  const [search, setSearch] = useState("");
  const [paymentDetail, setPaymentDetail] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [detailSale, setDetailSale] = useState(null);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState(data.customers);
  const [totalRows, setTotalRows] = useState(data.customers.length);
  useEffect(() => { setRows(data.customers); setTotalRows(data.customers.length); }, [data.customers]);
  useEffect(() => {
    if (!apiCall) return undefined;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ skip: String((page - 1) * pageSize), limit: String(pageSize), paged: "true" });
      if (search.trim()) params.set("q", search.trim());
      try {
        const pageData = unpackPaged(await apiCall(`/api/customers?${params.toString()}`));
        setRows(pageData.items);
        setTotalRows(pageData.total);
      } catch (error) {
        onError(error);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [apiCall, onError, search, page, pageSize]);
  async function viewPaymentHistory(row) {
    try {
      setPaymentDetail(await apiCall(`/api/customers/${row.id}/history`));
    } catch (error) {
      onError(error);
    }
  }
  async function updateCustomer(customer, payload) {
    try {
      const updated = await apiCall(`/api/customers/${customer.id}`, { method: "PUT", body: JSON.stringify(payload) });
      setRows((current) => current.map((row) => row.id === updated.id ? updated : row));
      setEditingCustomer(null);
      return updated;
    } catch (error) {
      onError(error);
      return null;
    }
  }
  function applyPaymentDetail(nextDetail) {
    setPaymentDetail(nextDetail);
    setRows((current) => current.map((row) => row.id === nextDetail.customer.id ? nextDetail.customer : row));
  }
  return (
    <section className="list-page">
      <div className="batch-toolbar"><label><Search size={18} /><input placeholder="Search..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label></div>
      <DataTable columns={[["name", "Name"], ["phone", "Phone#"], ["due_amount", "Due Amount"], ["actions", "Actions"]]} rows={rows} render={(row, key) => {
        if (key === "actions") {
          return (
            <SaleActionIcons>
              <button className="icon-action" type="button" title="Edit Customer" aria-label="Edit Customer" onClick={() => setEditingCustomer(row)}><Pencil size={18} /></button>
              <button className="icon-action" type="button" title="View Payment History" aria-label="View Payment History" onClick={() => viewPaymentHistory(row)}><Eye size={18} /></button>
            </SaleActionIcons>
          );
        }
        if (key === "due_amount") return fixedMoney(row[key]);
        return formatCell(row[key]);
      }} />
      <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
      {editingCustomer ? <EditCustomerModal customer={editingCustomer} close={() => setEditingCustomer(null)} onSave={updateCustomer} /> : null}
      {paymentDetail ? <CustomerPaymentHistoryModal detail={paymentDetail} apiCall={apiCall} onError={onError} onUpdated={applyPaymentDetail} close={() => setPaymentDetail(null)} onView={setDetailSale} onPrint={setInvoiceSale} /> : null}
      {detailSale ? <SalesHistoryDetailsModal sale={detailSale} data={data} close={() => setDetailSale(null)} /> : null}
      {invoiceSale ? <InvoiceModal sale={invoiceSale} data={data} close={() => setInvoiceSale(null)} /> : null}
    </section>
  );
}

function ProductHistoryModal({ product, filters, apiCall, onError, close, onView, onPrint }) {
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  useEffect(() => {
    if (!apiCall || !product?.product_id) return undefined;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ skip: String((page - 1) * pageSize), limit: String(pageSize) });
      if (filters?.dateMode === "range") {
        if (filters.dateFrom) params.set("date_from", filters.dateFrom);
        if (filters.dateTo) params.set("date_to", filters.dateTo);
      } else if (filters?.date) {
        params.set("date_from", filters.date);
        params.set("date_to", filters.date);
      }
      try {
        const result = await apiCall(`/api/reports/product-sales/${product.product_id}?${params.toString()}`);
        const pageData = unpackPaged(result);
        setRows(pageData.items);
        setTotalRows(pageData.total);
      } catch (error) {
        onError(error);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [apiCall, filters, onError, page, pageSize, product?.product_id]);
  const columns = [
    ["invoice_number", "Invoice Number"],
    ["date", "Date"],
    ["total_amount", "Total Amount (RS)"],
    ["discount_percent", "Discount(%)"],
    ["discount_amount", "Discount Amt"],
    ["total_payable", "Total Payable"],
    ["paid", "Paid"],
    ["due", "Due(s)"],
    ["change_returned", "Returned"],
    ["actions", "Actions"],
  ];
  return (
    <div className="modal-backdrop invoice-backdrop">
      <section className="history-detail-modal">
        <div className="invoice-head">
          <h2>View Product History</h2>
          <button type="button" aria-label="close" onClick={close}><X /></button>
        </div>
        <div className="history-detail-body">
          <DataTable columns={columns} rows={rows} render={(row, key) => {
            if (key === "actions") {
              return (
                <SaleActionIcons>
                  <button className="icon-action" type="button" aria-label="View" title="View" onClick={() => onView(row)}><Eye size={18} /></button>
                  <button className="icon-action" type="button" aria-label="Print Invoice" title="Print Invoice" onClick={() => onPrint(row)}><Printer size={18} /></button>
                </SaleActionIcons>
              );
            }
            if (key === "total_amount") return formatPlainCompactAmount(row[key]);
            if (["discount_percent", "discount_amount", "total_payable", "paid", "due", "change_returned"].includes(key)) return formatPlainFixedAmount(row[key]);
            return formatCell(row[key]);
          }} />
          <PaginationFooter page={page} pageSize={pageSize} rowCount={totalRows} currentCount={rows.length} totalKnown onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
        </div>
      </section>
    </div>
  );
}

function EditCustomerModal({ customer, close, onSave }) {
  const [form, setForm] = useState({ name: customer.name || "", phone: customer.phone || "" });
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    await onSave(customer, { name: form.name, phone: form.phone });
    setSaving(false);
  }
  return (
    <div className="modal-backdrop">
      <form className="simple-modal customer-edit-modal" onSubmit={submit}>
        <div className="modal-head">
          <h2>Edit Customer</h2>
          <button type="button" aria-label="close" onClick={close}><X /></button>
        </div>
        <div className="simple-modal-body customer-edit-body">
          <label>Name<input placeholder="Customer name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
          <label>Number<input inputMode="numeric" maxLength="11" placeholder="03xx xxxxxxx" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
        </div>
        <div className="modal-actions">
          <button className="primary modal-submit" type="submit" disabled={saving}>{saving ? "Updating..." : "Update"}</button>
        </div>
      </form>
    </div>
  );
}

function CustomerPaymentHistoryModal({ detail, apiCall, onError, onUpdated, close, onView, onPrint }) {
  const customer = detail.customer || {};
  const sales = detail.sales || [];
  const [receiveNow, setReceiveNow] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saving, setSaving] = useState(false);
  const customerSalePayable = (sale) => Number(sale.total_amount || 0) - Number(sale.discount_amount || 0);
  const total = sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), Number(detail.total_purchases || 0) && !sales.length ? Number(detail.total_purchases || 0) : 0);
  const totalPayable = sales.reduce((sum, sale) => sum + customerSalePayable(sale), 0) || total;
  const received = Number(detail.total_paid || 0);
  const due = Number(detail.total_due || customer.due_amount || 0);
  const receiveAmount = Number(receiveNow || 0);
  const returnedCash = Math.max(0, receiveAmount - due);
  async function clearDues() {
    const amount = receiveAmount > 0 ? receiveAmount : due;
    if (!amount || due <= 0) return;
    setSaving(true);
    try {
      const nextDetail = await apiCall(`/api/customers/${customer.id}/clear-dues`, {
        method: "POST",
        body: JSON.stringify({ amount, payment_method: paymentMethod }),
      });
      setReceiveNow("");
      onUpdated(nextDetail);
    } catch (error) {
      onError(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="modal-backdrop invoice-backdrop">
      <section className="history-detail-modal payment-history-modal">
        <div className="invoice-head">
          <h2>Payment History</h2>
          <button type="button" aria-label="close" onClick={close}><X /></button>
        </div>
        <div className="history-detail-body">
          <table className="data-table wide customer-payment-table">
            <thead><tr><th>Invoice No.</th><th>Date</th><th>Total Amt</th><th>Dis(%)</th><th>Dis Amt</th><th>Total Payable</th><th>Paid</th><th>Due(s)</th><th>Actions</th></tr></thead>
            <tbody>{sales.length ? sales.map((sale) => (
              <tr key={sale.id}>
                <td>{sale.invoice_number}</td>
                <td>{formatDashDate(sale.date)}</td>
                <td>{referenceMoney(sale.total_amount)}</td>
                <td>{referenceMoney(sale.discount_percent || 0)}</td>
                <td>{referenceMoney(sale.discount_amount || 0)}</td>
                <td>{referenceMoney(customerSalePayable(sale))}</td>
                <td>{referenceMoney(sale.paid)}</td>
                <td>{referenceMoney(sale.due)}</td>
                <td>
                  <SaleActionIcons>
                    <button className="icon-action" type="button" title="View" aria-label="View" onClick={() => onView(sale)}><Eye size={18} /></button>
                    <button className="icon-action" type="button" title="Print Invoice" aria-label="Print Invoice" onClick={() => onPrint(sale)}><Printer size={18} /></button>
                  </SaleActionIcons>
                </td>
              </tr>
            )) : <tr><td colSpan="9" className="empty">No Data Found</td></tr>}
              <tr className="table-summary-row">
                <td>Invoice(s)</td>
                <td>Till Today</td>
                <td>{referenceMoney(total)}</td>
                <td>{referenceMoney(sales.reduce((sum, sale) => sum + Number(sale.discount_percent || 0), 0))}</td>
                <td>{referenceMoney(sales.reduce((sum, sale) => sum + Number(sale.discount_amount || 0), 0))}</td>
                <td>{referenceMoney(totalPayable)}</td>
                <td>{referenceMoney(received)}</td>
                <td>{referenceMoney(due)}</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
          <section className="customer-payment-summary">
            <div className="payment-left">
              <strong className="total-amount">Total: Rs {referenceMoney(total)}</strong>
              <strong className="total-amount">Received: Rs {referenceMoney(received)}</strong>
              <div className="payment-methods">
                <span>Select Payment Method</span>
                <label><input type="radio" name="customer-payment-method" checked={paymentMethod === "card_payment"} onChange={() => setPaymentMethod("card_payment")} /><b>VISA</b></label>
                <label><input type="radio" name="customer-payment-method" checked={paymentMethod === "easy_paisa"} onChange={() => setPaymentMethod("easy_paisa")} /><b>e</b></label>
                <label><input type="radio" name="customer-payment-method" checked={paymentMethod === "jazz_cash"} onChange={() => setPaymentMethod("jazz_cash")} /><b>JazzCash</b></label>
                <label><input type="radio" name="customer-payment-method" checked={paymentMethod === "bank_transfer"} onChange={() => setPaymentMethod("bank_transfer")} /><b>Card</b></label>
                <label><input type="radio" name="customer-payment-method" checked={paymentMethod === "cash"} onChange={() => setPaymentMethod("cash")} /><b className="cash-icon">Cash</b></label>
              </div>
            </div>
            <div className="payment-right">
              <div className="due-payment"><span>Due Payment</span><strong>Rs. {referenceMoney(due)}</strong></div>
              <div className="paid-amount">Paid Amount: Rs {referenceMoney(received)}</div>
              <label className="receive-now"><span>Receive Now:</span><input type="number" min="0" placeholder="Payment" value={receiveNow} onChange={(event) => setReceiveNow(event.target.value)} /></label>
              <div className="returned-cash"><strong>Returned Cash:</strong> RS. {referenceMoney(returnedCash)}</div>
              <button className="primary" type="button" disabled={saving || due <= 0} onClick={clearDues}>{saving ? "Clearing..." : "Clear Dues"}</button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function ReportPage({ title, radios, inputs, rows, columns, render, printFormatValue, salesSummary = false, returnSummary = false, summaryTotals, totalRows, showTimeFilters = false, onFiltersChange, onPrintRows }) {
  const initialMode = radios[0]?.toLowerCase().includes("range") ? "range" : "single";
  const [dateMode, setDateMode] = useState(initialMode);
  const [date, setDate] = useState(today());
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [timeFrom, setTimeFrom] = useState("12:00 AM");
  const [timeTo, setTimeTo] = useState("11:59 PM");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [printing, setPrinting] = useState(false);
  const [printOptionsOpen, setPrintOptionsOpen] = useState(false);
  const [printOption, setPrintOption] = useState("current");
  function changeDateMode(mode) {
    setDateMode(mode);
    setPage(1);
    if (mode === "range") {
      setDateFrom("");
      setDateTo("");
    } else {
      setDate(today());
    }
  }
  useEffect(() => {
    if (!onFiltersChange) return;
    const timer = setTimeout(() => onFiltersChange({ dateMode, date, dateFrom, dateTo, timeFrom, timeTo, search, status, page, pageSize }), 150);
    return () => clearTimeout(timer);
  }, [dateMode, date, dateFrom, dateTo, timeFrom, timeTo, search, status, page, pageSize, onFiltersChange]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    const rowDate = String(row.date || row.created_at || "").slice(0, 10);
    const inDate = dateMode === "range" ? (!dateFrom || rowDate >= dateFrom) && (!dateTo || rowDate <= dateTo) : !date || rowDate === date;
    const rowTime = parseTimeToMinutes(String(row.time || "").slice(0, 5));
    const fromTime = parseTimeToMinutes(timeFrom);
    const toTime = parseTimeToMinutes(timeTo);
    const inTime = !showTimeFilters || rowTime == null || ((fromTime == null || rowTime >= fromTime) && (toTime == null || rowTime <= toTime));
    const inStatus = !salesSummary || status === "all" || row.status === status;
    const text = `${Object.values(row).join(" ")} ${(row.items || []).map((item) => Object.values(item).join(" ")).join(" ")}`.toLowerCase();
    return inDate && inTime && inStatus && (!search.trim() || text.includes(search.trim().toLowerCase()));
  }), [rows, dateMode, date, dateFrom, dateTo, timeFrom, timeTo, search, salesSummary, status, showTimeFilters]);
  const displayRows = onFiltersChange ? rows : filteredRows;
  const effectiveRowCount = totalRows ?? displayRows.length;
  const salesTotals = useMemo(() => {
    const grossSales = displayRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
    const totalDiscount = displayRows.reduce((sum, row) => sum + Number(row.discount_amount || 0), 0);
    const netSales = displayRows.reduce((sum, row) => sum + Number(row.total_payable || 0), 0);
    const totalCost = displayRows.reduce((sum, row) => sum + (row.items || []).reduce((itemSum, item) => itemSum + Number(item.cost_price || 0) * Number(item.total_qty || 0), 0), 0);
    const pending = displayRows.reduce((sum, row) => sum + Number(row.due || 0), 0);
    return { grossSales, totalDiscount, netSales, totalCost, netRevenue: netSales - totalCost, pending };
  }, [displayRows]);
  const displayedSalesTotals = summaryTotals ? {
    grossSales: Number(summaryTotals.gross_sales || 0),
    totalDiscount: Number(summaryTotals.total_discount || 0),
    netSales: Number(summaryTotals.net_sales || 0),
    totalCost: Number(summaryTotals.total_cost || 0),
    netRevenue: Number(summaryTotals.net_revenue || 0),
    pending: Number(summaryTotals.pending || 0),
  } : salesTotals;
  const returnTotals = summaryTotals ? {
    grossSales: Number(summaryTotals.gross_sales || 0),
    totalReturn: Number(summaryTotals.total_return || 0),
    netSale: Number(summaryTotals.net_sale || 0),
  } : {
    grossSales: displayRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    totalReturn: displayRows.reduce((sum, row) => sum + Number(row.amount || row.total_amount || 0), 0),
    netSale: 0,
  };
  if (!summaryTotals && returnSummary) returnTotals.netSale = returnTotals.grossSales - returnTotals.totalReturn;
  async function printReport(option = "current") {
    try {
      setPrinting(true);
      const shouldPrintEntire = option === "entire" || option === "entire_summary";
      const shouldPrintSummary = option === "current_summary" || option === "entire_summary";
      const rowsToPrint = shouldPrintEntire && onPrintRows ? await onPrintRows({ dateMode, date, dateFrom, dateTo, timeFrom, timeTo, search, status, page, pageSize }) : displayRows;
      const summaryToPrint = shouldPrintSummary ? (shouldPrintEntire ? displayedSalesTotals : salesTotals) : null;
      if (title === "Sales History") {
        printSalesHistoryReport(rowsToPrint, summaryToPrint, { dateMode, date, dateFrom, dateTo });
      } else {
        printTable(title, rowsToPrint, columns, { summary: summaryToPrint, formatValue: printFormatValue });
      }
      setPrintOptionsOpen(false);
    } finally {
      setPrinting(false);
    }
  }
  const activeFilters = { dateMode, date, dateFrom, dateTo, timeFrom, timeTo, search, status, page, pageSize };
  const dateControls = dateMode === "range" ? <>
    <label><span className="field-title">From Date</span><input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>
    <label><span className="field-title">To Date</span><input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /></label>
  </> : <label><span className="field-title">Date</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} /></label>;
  const timeControls = showTimeFilters ? <>
    <label><span className="field-title">Time</span><input type="tel" placeholder="hh:mm (a|p)m" value={timeFrom} onChange={(event) => { setTimeFrom(event.target.value); setPage(1); }} onBlur={() => setTimeFrom((value) => formatTimeInput(value, "12:00 AM"))} /></label>
    <label><span className="field-title">&nbsp;</span><input type="tel" placeholder="hh:mm (a|p)m" value={timeTo} onChange={(event) => { setTimeTo(event.target.value); setPage(1); }} onBlur={() => setTimeTo((value) => formatTimeInput(value, "11:59 PM"))} /></label>
  </> : null;
  const searchControls = inputs.map((placeholder) => <input key={placeholder} placeholder={placeholder} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />);
  const radioControls = <div className="tabs report-tabs">{radios.map((radio) => {
    const mode = radio.toLowerCase().includes("range") ? "range" : "single";
    return <label key={radio}><input type="radio" value={mode} checked={dateMode === mode} onChange={() => changeDateMode(mode)} /> {radio}</label>;
  })}</div>;
  const salesSummaryCards = [
    ["Gross Sales", displayedSalesTotals.grossSales, "sky"],
    ["Total Discount", displayedSalesTotals.totalDiscount, "blue"],
    ["Net Sales", displayedSalesTotals.netSales, "navy"],
    ["Total Cost", displayedSalesTotals.totalCost, "teal"],
    ["Net Revenue", displayedSalesTotals.netRevenue, "green"],
    ["Pending", displayedSalesTotals.pending, "mint"],
  ];
  return (
    <section className={`list-page report-page${salesSummary ? " sales-history-report" : ""}`}>
      {salesSummary ? (
        <div className="sales-report-controls">
          <div className="sales-report-topline">
            {radioControls}
            <div className="sales-report-date-controls">{dateControls}{timeControls}</div>
            <button className="text-button report-print" type="button" disabled={printing || !displayRows.length} onClick={() => setPrintOptionsOpen(true)}>
              <span>{printing ? "Preparing..." : "Print Sales History"}</span><Printer size={28} />
            </button>
          </div>
          <div className="sales-report-secondline">
            <TextOptionPicker
              className="status-filter"
              ariaLabel="Sale status"
              value={status}
              options={[
                { value: "all", label: "All" },
                { value: "paid", label: "Paid" },
                { value: "partial", label: "Partial" },
                { value: "draft", label: "Draft" },
                { value: "returned", label: "Returned" },
              ]}
              onChange={(value) => { setStatus(value); setPage(1); }}
            />
            <label className="search-field report-search">{searchControls}<Search size={20} /></label>
          </div>
        </div>
      ) : (
        <>
          {radioControls}
          <div className="report-filters">
            {dateControls}
            {timeControls}
            {searchControls}
            {returnSummary ? (
              <TextOptionPicker
                className="status-filter"
                ariaLabel="Return status"
                value="all"
                options={[{ value: "all", label: "All" }]}
                onChange={() => setPage(1)}
              />
            ) : null}
          </div>
        </>
      )}
      {salesSummary ? <div className="sales-summary-strip">
        {salesSummaryCards.map(([label, value, tone]) => <SummaryMetric key={label} label={label} value={value} tone={tone} />)}
      </div> : null}
      {returnSummary ? <div className="sales-summary-strip">
        <SummaryMetric label="Gross Sales" value={returnTotals.grossSales} />
        <SummaryMetric label="Total Return" value={returnTotals.totalReturn} />
        <SummaryMetric label="Net Sale" value={returnTotals.netSale} />
      </div> : null}
      {displayRows.length ? (
        <>
          <div className="report-table-wrap"><DataTable columns={columns} rows={displayRows} render={render ? (row, key) => render(row, key, activeFilters) : undefined} /></div>
          <PaginationFooter page={page} pageSize={pageSize} rowCount={effectiveRowCount} currentCount={displayRows.length} totalKnown={totalRows != null} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
        </>
      ) : <p className="report-empty">No data found.</p>}
      {printOptionsOpen ? (
        <PrintOptionsModal
          option={printOption}
          setOption={setPrintOption}
          printing={printing}
          close={() => setPrintOptionsOpen(false)}
          print={() => printReport(printOption)}
        />
      ) : null}
    </section>
  );
}

function SummaryMetric({ label, value, tone = "blue" }) {
  return <div className={`sales-summary-metric tone-${tone}`}><span>{label}</span><strong>Rs. {money(value)}</strong></div>;
}

function PrintOptionsModal({ option, setOption, printing, close, print }) {
  const options = [
    ["current", "Current Page Only"],
    ["entire", "Entire Sales History"],
    ["current_summary", "Current Page Summary"],
    ["entire_summary", "Entire Sales History Summary"],
  ];
  return (
    <div className="modal-backdrop invoice-backdrop">
      <section className="print-options-modal">
        <div className="invoice-head">
          <h2><Printer size={18} /> Choose Print Option</h2>
        </div>
        <div className="print-options-body">
          <p>Please choose what you want to print</p>
          <div className="print-option-list">
            {options.map(([value, label]) => (
              <label key={value}>
                <input type="radio" name="print-option" value={value} checked={option === value} onChange={() => setOption(value)} />
                {label}
              </label>
            ))}
          </div>
          <div className="print-options-actions">
            <button className="outline" type="button" onClick={close}>Cancel</button>
            <button className="primary" type="button" disabled={printing} onClick={print}>{printing ? "Preparing..." : "Print"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReturnItemPage({ data, apiCall, reload, onError }) {
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [sale, setSale] = useState(null);
  const [returnQty, setReturnQty] = useState({});
  const [returnInvoice, setReturnInvoice] = useState(null);
  const returnRows = useMemo(() => (sale?.items || []).map((item) => {
    const returned = data.returns
      .filter((row) => Number(row.sale_id) === Number(sale.id) && Number(row.batch_id) === Number(item.batch_id))
      .reduce((sum, row) => sum + Number(row.qty_returned || 0), 0);
    const remaining = Math.max(0, Number(item.total_qty || 0) - returned);
    const unitPayable = Number(item.total_qty || 0) ? Number(item.payable_amount ?? item.amount ?? 0) / Number(item.total_qty || 1) : Number(item.rate || 0);
    const selectedQty = Number(returnQty[item.batch_id] || 0);
    return {
      ...item,
      quantity_sold: Number(item.total_qty || 0),
      quantity_returned: returned,
      returnable_qty: remaining,
      unit_refund_amount: unitPayable,
      amount: selectedQty * unitPayable,
    };
  }), [sale, data.returns, returnQty]);

  const selectedReturnRows = returnRows.filter((row) => {
    const qty = Number(returnQty[row.batch_id] || 0);
    return qty > 0 && qty <= Number(row.returnable_qty || 0);
  });

  async function lookupInvoice() {
    const query = invoiceQuery.trim();
    if (!query) return;
    try {
      const match = /^\d+$/.test(query)
        ? await apiCall(`/api/sales/${query}`)
        : await apiCall(`/api/sales/by-invoice/${encodeURIComponent(query)}`);
      setSale(match);
      setReturnQty(Object.fromEntries((match.items || []).map((item) => [item.batch_id, ""])));
    } catch (error) {
      setSale(null);
      onError(error.status === 404 ? new Error("Invoice not found.") : error);
    }
  }

  async function generateReturnInvoice() {
    if (!sale) {
      await lookupInvoice();
      return;
    }
    if (!selectedReturnRows.length) {
      onError(new Error("Enter a valid return quantity."));
      return;
    }
    try {
      const returnInvoiceNumber = localReturnInvoiceNumber();
      const createdReturns = await apiCall("/api/returns/bulk", {
        method: "POST",
        body: JSON.stringify({
          returns: selectedReturnRows.map((row) => {
            const qty = Number(returnQty[row.batch_id] || 0);
            return {
              return_invoice_number: returnInvoiceNumber,
              sale_id: sale.id,
              batch_id: row.batch_id,
              qty_sold: row.quantity_sold,
              qty_returned: qty,
              rate: Number(row.rate || 0),
              amount: qty * Number(row.unit_refund_amount || row.rate || 0),
              reason: "Customer return",
              refund_method: "cash",
              date: today(),
            };
          }),
        }),
      });
      await reload();
      const refreshed = await apiCall(`/api/sales/${sale.id}`);
      setSale(refreshed);
      setReturnQty(Object.fromEntries((refreshed.items || []).map((item) => [item.batch_id, ""])));
      setReturnInvoice({ sale: refreshed, returns: createdReturns });
    } catch (error) {
      onError(error);
    }
  }

  return (
    <section className="list-page">
      <div className="return-search reference-return-search">
        <label>
          <span className="field-title">Reference Invoice #</span>
          <input placeholder="Enter the original invoice#" value={invoiceQuery} onChange={(event) => { setInvoiceQuery(event.target.value); setSale(null); }} onKeyDown={(event) => { if (event.key === "Enter") lookupInvoice(); }} />
        </label>
        <label>
          <span className="field-title">Return Invoice Date</span>
          <input readOnly value={formatDashDate(today())} />
        </label>
      </div>
      <section className="sale-items-panel return-items-panel">
        <div className="sale-items-title">Purchased Items List</div>
        <DataTable emptyText="No Data Found!" columns={[["batch_no", "Batch no."], ["product_name", "Name"], ["quantity_sold", "Quantity Sold"], ["quantity_returned", "Quantity Returned"], ["rate", "Rate/Sell Price"], ["amount", "Amount"], ["actions", "Action"]]} rows={returnRows} render={(row, key) => {
          if (key === "quantity_returned") return <input className="table-input" type="number" min="0" max={row.returnable_qty} placeholder={formatCompactNumber(row.returnable_qty)} value={returnQty[row.batch_id] || ""} onChange={(event) => setReturnQty((current) => ({ ...current, [row.batch_id]: event.target.value }))} />;
          if (key === "amount") return money(row.amount);
          if (key === "actions") return <button className="icon-action danger" type="button" disabled={!returnQty[row.batch_id]} onClick={() => setReturnQty((current) => ({ ...current, [row.batch_id]: "" }))} title="Clear return quantity"><Trash2 size={18} /></button>;
          return formatCell(row[key]);
        }} />
      </section>
      <div className="return-actions">
        <button className="primary" type="button" disabled={sale ? !selectedReturnRows.length : !invoiceQuery.trim()} onClick={generateReturnInvoice}>Generate Invoice</button>
      </div>
      {returnInvoice ? <ReturnInvoiceModal detail={returnInvoice} close={() => setReturnInvoice(null)} /> : null}
    </section>
  );
}

function TechnicalHelpPage({ setRoute }) {
  return (
    <section className="technical-help">
      <h1>For any Query Contact Hassan Pharmacy Care</h1>
      <a className="technical-phone" href="tel:03324122333">03324122333</a>
      <a className="technical-email" href="mailto:hassanpharmacy344@gmail.com">hassanpharmacy344@gmail.com</a>
      <button className="technical-back-button" type="button" onClick={() => setRoute("dashboard")}><ArrowLeft size={22} /> GO BACK TO DASHBOARD</button>
    </section>
  );
}

function DataTable({ columns, rows = [], render, emptyText = "No Data Found" }) {
  return (
    <table className="data-table wide"><thead><tr>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{rows.length ? rows.map((row, index) => <tr className={row.__summary ? "table-summary-row" : undefined} key={row.id || index}>{columns.map(([key]) => <td key={key}>{render ? render(row, key) : formatCell(row[key])}</td>)}</tr>) : <tr><td colSpan={columns.length} className="empty">{emptyText}</td></tr>}</tbody></table>
  );
}

function GenericInput({ field, value, onChange, hideLabel = false }) {
  if (field.type === "textarea") {
    return <label>{hideLabel ? null : <span className="field-title">{field.label}</span>}<textarea aria-label={hideLabel ? field.label : undefined} required={field.required} value={value} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
  }
  if (field.type === "lookup-select") {
    return <LookupSelectInput field={field} value={value} onChange={onChange} hideLabel={hideLabel} />;
  }
  if (field.type === "select") {
    return <SelectField hideLabel={hideLabel} label={field.label} required={field.required} value={value} onChange={onChange} options={field.options || []} placeholder={field.showPlaceholder === false ? "" : (field.placeholder || "Select an option")} />;
  }
  return <Field hideLabel={hideLabel} label={field.label} required={field.required} type={field.type || "text"} value={value} placeholder={field.placeholder} onChange={onChange} />;
}

function LookupSelectInput({ field, value, onChange, hideLabel = false }) {
  const selected = field.options.find((option) => String(option.id) === String(value));
  const [query, setQuery] = useState(selected?.name || "");
  useEffect(() => {
    const nextSelected = field.options.find((option) => String(option.id) === String(value));
    setQuery(nextSelected?.name || "");
  }, [field.options, value]);
  return <LookupField hideLabel={hideLabel} label={field.label} required={field.required} value={value} query={query} onQueryChange={(nextQuery) => { setQuery(nextQuery); onChange(""); }} onSelect={(option) => { onChange(option.id); setQuery(option.name); }} options={field.options} placeholder={field.placeholder ?? field.label} addLabel="" />;
}

function PaginationFooter({ page = 1, pageSize = 50, pageSizeOptions = [50, 100], rowCount = 0, currentCount = rowCount, totalKnown = false, onPageChange, onPageSizeChange } = {}) {
  const canBack = page > 1;
  const totalPages = Math.max(1, Math.ceil(Number(rowCount || 0) / Number(pageSize || 1)));
  const canNext = totalKnown ? page < totalPages && currentCount > 0 : currentCount >= pageSize;
  const start = totalKnown && rowCount ? ((page - 1) * pageSize) + 1 : 0;
  const end = totalKnown && rowCount ? Math.min(rowCount, (page - 1) * pageSize + (currentCount || pageSize)) : 0;
  const pageButtons = (() => {
    if (!totalKnown || totalPages <= 1) return [page];
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  })();
  return <div className="pagination">
    <button className="outline" disabled={!canBack} onClick={() => onPageChange?.(Math.max(1, page - 1))}>&lt; BACK</button>
    {pageButtons.map((item, index) => item === "..." ? (
      <span className="page-ellipsis" key={`ellipsis-${index}`}>...</span>
    ) : (
      <button className={item === page ? "primary" : "outline"} type="button" key={item} onClick={() => onPageChange?.(item)}>{item}</button>
    ))}
    <button className="outline" disabled={!canNext} onClick={() => onPageChange?.(page + 1)}>NEXT &gt;</button>
    <span className="rows-per-page-label">Rows per page</span>
    <PageSizePicker value={pageSize} options={pageSizeOptions} onChange={onPageSizeChange} />
    {totalKnown ? <span className="page-count">{start}-{end} of {rowCount}</span> : null}
  </div>;
}

function PageSizePicker({ value, options = [50, 100], onChange }) {
  const [open, setOpen] = useState(false);
  function choose(option) {
    onChange?.(Number(option));
    setOpen(false);
  }
  return (
    <div className="page-size-picker">
      <input
        aria-label="Rows per page"
        readOnly
        value={value}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open ? <div className="page-size-menu">
        {options.map((option) => <button key={option} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>{option}</button>)}
      </div> : null}
    </div>
  );
}

function TextOptionPicker({ value, options = [], onChange, className = "", ariaLabel = "Select option", placeholder = "" }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => String(option.value) === String(value)) || options[0];
  function choose(option) {
    onChange?.(option.value);
    setOpen(false);
  }
  return (
    <div className={`text-option-picker ${className}`.trim()}>
      <input
        aria-label={ariaLabel}
        placeholder={placeholder}
        readOnly
        value={selected?.label || ""}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open ? <div className="text-option-menu">
        {options.map((option) => <button key={option.value} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>{option.label}</button>)}
      </div> : null}
    </div>
  );
}

function cleanPayload(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== "" && value != null));
}

function formatCell(value) {
  if (value == null || value === "") return "-";
  if (typeof value === "number") return Number.isInteger(value) ? value : money(value);
  return String(value);
}

function formatSalesHistoryCell(row, key) {
  if (key === "total_amount") return formatHistoryCompactAmount(row[key]);
  if (["discount_percent", "discount_amount", "total_payable", "paid", "due", "change_returned"].includes(key)) return formatHistoryFixedAmount(row[key]);
  return formatCell(row[key]);
}

function formatHistoryCompactAmount(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function formatHistoryFixedAmount(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPlainCompactAmount(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString(undefined, { useGrouping: false, maximumFractionDigits: 2 });
}

function formatPlainFixedAmount(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString(undefined, { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatIndianInteger(value) {
  if (value == null || value === "") return "-";
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function rowMatchesSearch(row, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = Object.values(row || {})
    .flatMap((value) => Array.isArray(value) ? value.flatMap((item) => Object.values(item || {})) : [value])
    .join(" ")
    .toLowerCase();
  return text.includes(q);
}

function needsOrderPurchase(product) {
  const total = Number(product.total_quantity || 0);
  const remaining = Number(product.remaining_quantity || 0);
  return total > 0 && remaining <= total * 0.3;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatInvoiceDate(sale) {
  const date = String(sale.date || "").split("-");
  const formattedDate = date.length === 3 ? `${date[2]}/${date[1]}/${date[0]}` : sale.date || "";
  return `${formattedDate} ${formatHistoryTime(sale.time)}`.trim();
}

function invoiceReceiptTotals(sale) {
  const grossSource = sale.reference_original_total_amount ?? sale.total_amount;
  return {
    gross: Math.round(Number(grossSource || 0)),
    discount: Number(sale.reference_original_discount_amount ?? sale.discount_amount ?? 0),
    net: Number(sale.reference_original_total_payable ?? sale.total_payable ?? 0),
    paid: Number(sale.reference_original_paid ?? sale.paid ?? 0),
    due: Number(sale.reference_original_due ?? sale.due ?? 0),
  };
}

function receiptProductName(item, data) {
  if (item.reference_receipt_name) return item.reference_receipt_name;
  if (item.product_weight && item.product_unit) return `${item.product_name}${item.product_weight} ${item.product_unit}`;
  if (item.product_weight) return `${item.product_name}${item.product_weight}`;
  const product = (data?.products || []).find((row) => Number(row.id) === Number(item.product_id) || String(row.name || "").trim().toLowerCase() === String(item.product_name || "").trim().toLowerCase());
  if (product?.weight && product?.unit) return `${item.product_name}${product.weight} ${product.unit}`;
  if (product?.weight) return `${item.product_name}${product.weight}`;
  return item.product_name;
}

function formatDisplayDate(value) {
  const date = String(value || "").split("-");
  return date.length === 3 ? `${date[2]}/${date[1]}/${date[0]}` : value || "";
}

function formatSlashDate(value) {
  const text = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.replaceAll("-", "/");
  return text;
}

function normalizeDateForApi(value) {
  const text = String(value || "").trim();
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(text)) return text.replaceAll("/", "-");
  return text;
}

function formatTableDate(value) {
  const dateValue = String(value || "").slice(0, 10);
  const date = dateValue.split("-");
  return date.length === 3 && date[0].length === 4 ? `${date[2]}/${date[1]}/${date[0]}` : value || "";
}

function formatDashDate(value) {
  const date = String(value || "").split("-");
  return date.length === 3 ? `${date[2]}-${date[1]}-${date[0]}` : value || "";
}

function formatTimeDisplay(value) {
  const [hoursValue, minutes = "00"] = String(value || "").split(":");
  const hours = Number(hoursValue);
  if (!Number.isFinite(hours)) return "";
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${minutes} ${period}`;
}

function formatHistoryTime(value) {
  const parts = String(value || "").trim().split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] || 0);
  const seconds = Number(parts[2] || 0);
  if (!Number.isFinite(hours) || /am|pm/i.test(String(value || ""))) return value || "";
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} ${period}`;
}

function formatAmPmTime(value, period) {
  const compact = String(value || "").slice(0, 5);
  return `${compact || "--:--"} ${period || ""}`.trim();
}

function parseTimeToMinutes(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const amPmMatch = raw.match(/^(\d{1,2}):?(\d{2})?\s*([ap])\.?m?\.?$/i);
  if (amPmMatch) {
    let hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2] || 0);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    const period = amPmMatch[3].toLowerCase();
    if (period === "p" && hours < 12) hours += 12;
    if (period === "a" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const twentyFourMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hours = Number(twentyFourMatch[1]);
    const minutes = Number(twentyFourMatch[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }
  return null;
}

function minutesToTimeLabel(minutes) {
  if (minutes == null) return "";
  const normalized = Math.max(0, Math.min(1439, Number(minutes)));
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
}

function normalizeTimeForApi(value) {
  const minutes = parseTimeToMinutes(value);
  if (minutes == null) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatTimeInput(value, fallback) {
  const minutes = parseTimeToMinutes(value);
  return minutes == null ? fallback : minutesToTimeLabel(minutes);
}

function printInvoiceReceipt(sale, policy, data) {
  const items = sale.items || [];
  const totals = invoiceReceiptTotals(sale);
  const paymentRows = sale.reference_original_due_display === ""
    ? ""
    : `<div class="total"><span>Payment Received:</span><strong>Rs. ${htmlEscape(money(totals.paid))}</strong></div>
          <div class="total"><span>Due Payment:</span><strong>Rs. ${htmlEscape(money(totals.due))}</strong></div>`;
  const itemRows = items.length
    ? items.map((item) => `<tr><td>${htmlEscape(receiptProductName(item, data))}</td><td>${htmlEscape(money(item.total_qty))}</td><td>${htmlEscape(money(item.rate))}</td><td>${htmlEscape(money(item.payable_amount ?? item.amount))}</td></tr>`).join("")
    : `<tr><td colspan="4">No items found</td></tr>`;
  const printWindow = window.open("", "_blank", "width=420,height=700");
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>Invoice ${htmlEscape(sale.invoice_number)}</title>
        <style>
          body { color: #111; font-family: Arial, Helvetica, sans-serif; margin: 0; }
          .receipt { margin: 0 auto; padding: 14px 12px; width: 300px; }
          h1 { font-size: 20px; margin: 0; text-align: center; }
          p { font-size: 12px; margin: 3px 0; text-align: center; }
          .meta { border-top: 1px dashed #777; border-bottom: 1px dashed #777; display: grid; gap: 3px; margin: 9px 0; padding: 7px 0; }
          .meta span { font-size: 12px; }
          table { border-collapse: collapse; font-size: 11px; width: 100%; }
          th, td { border-bottom: 1px solid #ddd; padding: 5px 3px; text-align: left; vertical-align: top; }
          th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
          .total { display: flex; font-size: 12px; justify-content: space-between; margin-top: 8px; }
          .policy { border-top: 1px dashed #777; margin-top: 10px; padding-top: 8px; }
          @media print { @page { margin: 5mm; size: 80mm auto; } .receipt { width: auto; } }
        </style>
      </head>
      <body>
        <section class="receipt">
          <h1>Hassan Pharmacy</h1>
          <p>Pharmacy Management System</p>
          <p>DHA phase 2 extension</p>
          <p>Phone # 03324122333</p>
          <p>License No. 1</p>
          <div class="meta">
            ${sale.customer_name ? `<span>C.Name: ${htmlEscape(sale.customer_name)}</span>` : ""}
            ${sale.customer_phone ? `<span>C.Ph #: ${htmlEscape(sale.customer_phone)}</span>` : ""}
            <span>Inv. No: ${htmlEscape(sale.invoice_number)}</span>
            <span>C. By: Admin</span>
            <span>${htmlEscape(formatInvoiceDate(sale))}</span>
          </div>
          <table><thead><tr><th>Item(s)</th><th>QTY</th><th>Price</th><th>Amt</th></tr></thead><tbody>${itemRows}</tbody></table>
          <div class="total"><span>Total Items: ${items.length}</span></div>
          <div class="total"><span>Gross Total:</span><strong>Rs. ${htmlEscape(money(totals.gross))}</strong></div>
          <div class="total"><span>Discount:</span><strong>Rs. ${htmlEscape(money(totals.discount))}</strong></div>
          <div class="total"><span>Net Total:</span><strong>Rs. ${htmlEscape(money(totals.net))}</strong></div>
          ${paymentRows}
          <p class="policy">${htmlEscape(policy)}</p>
          <p>Software By Hassan Pharmacy, Phone# 03324122333</p>
        </section>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function printReturnReceipt(detail) {
  const sale = detail.sale || {};
  const returns = detail.returns || [];
  const invoiceNumber = returns[0]?.return_invoice_number || "Return Invoice";
  const total = returns.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const itemRows = returns.length
    ? returns.map((row) => `<tr><td>${htmlEscape(row.product_name)}</td><td>${htmlEscape(formatCompactNumber(row.qty_returned))}</td><td>${htmlEscape(money(row.rate))}</td><td>${htmlEscape(money(row.amount))}</td></tr>`).join("")
    : `<tr><td colspan="4">No return items found</td></tr>`;
  const printWindow = window.open("", "_blank", "width=420,height=700");
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>${htmlEscape(invoiceNumber)}</title>
        <style>
          body { color: #111; font-family: Arial, Helvetica, sans-serif; margin: 0; }
          .receipt { margin: 0 auto; padding: 14px 12px; width: 300px; }
          h1 { font-size: 20px; margin: 0; text-align: center; }
          p { font-size: 12px; margin: 3px 0; text-align: center; }
          .meta { border-top: 1px dashed #777; border-bottom: 1px dashed #777; display: grid; gap: 3px; margin: 9px 0; padding: 7px 0; }
          .meta span { font-size: 12px; }
          table { border-collapse: collapse; font-size: 11px; width: 100%; }
          th, td { border-bottom: 1px solid #ddd; padding: 5px 3px; text-align: left; vertical-align: top; }
          th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
          .total { display: flex; font-size: 12px; justify-content: space-between; margin-top: 8px; }
          @media print { @page { margin: 5mm; size: 80mm auto; } .receipt { width: auto; } }
        </style>
      </head>
      <body>
        <section class="receipt">
          <h1>Hassan Pharmacy</h1>
          <p>Pharmacy Management System</p>
          <p>Phone # 03324122333</p>
          <p>License No. 1</p>
          <div class="meta">
            <span>Return Inv. No: ${htmlEscape(invoiceNumber)}</span>
            <span>Original Inv. No: ${htmlEscape(sale.invoice_number)}</span>
            <span>${htmlEscape(formatInvoiceDate(sale))}</span>
          </div>
          <table><thead><tr><th>Item(s)</th><th>Returned</th><th>Price</th><th>Amt</th></tr></thead><tbody>${itemRows}</tbody></table>
          <div class="total"><span>Total Items: ${returns.length}</span></div>
          <div class="total"><span>Total Return:</span><strong>Rs. ${htmlEscape(money(total))}</strong></div>
          <p>Software By Hassan Pharmacy, Phone# 03324122333</p>
        </section>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function printSalesHistoryReport(rows, summary, filters = {}) {
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) return;
  const compact = (value) => {
    if (value == null || value === "") return "0";
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString(undefined, { useGrouping: false, maximumFractionDigits: 14 }) : String(value);
  };
  const fixed = (value) => Number(value || 0).toLocaleString(undefined, { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rupees = (value) => `Rs. ${fixed(value)}`;
  const reportDate = (() => {
    if (filters.dateMode === "range" && filters.dateFrom && filters.dateTo) return `${formatDisplayDate(filters.dateFrom)} to ${formatDisplayDate(filters.dateTo)}`;
    if (filters.dateMode === "range" && filters.dateFrom) return `From ${formatDisplayDate(filters.dateFrom)}`;
    if (filters.dateMode === "range" && filters.dateTo) return `Till ${formatDisplayDate(filters.dateTo)}`;
    if (filters.date) return `Till ${formatDisplayDate(filters.date)}`;
    return `Till ${formatDisplayDate(today())}`;
  })();
  const totals = summary || {
    grossSales: rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    totalDiscount: rows.reduce((sum, row) => sum + Number(row.discount_amount || 0), 0),
    totalCost: rows.reduce((sum, row) => {
      if (row.reference_cost_amount != null) return sum + Number(row.reference_cost_amount || 0);
      return sum + (row.items || []).reduce((itemSum, item) => itemSum + Number(item.cost_price || 0) * Number(item.total_qty || 0), 0);
    }, 0),
    pending: rows.reduce((sum, row) => sum + Number(row.due || 0), 0),
  };
  const netRevenue = Number(totals.netRevenue ?? (Number(totals.grossSales || 0) - Number(totals.totalDiscount || 0) - Number(totals.totalCost || 0)));
  const tableRows = rows.length
    ? rows.map((row) => `<tr>
      <td>${htmlEscape(row.invoice_number || "")}${row.return_invoice_number || row.is_return ? "<br><small>Return Invoice</small>" : ""}</td>
      <td>${htmlEscape(formatDisplayDate(row.date))}</td>
      <td>${htmlEscape(rupees(compact(row.total_amount)))}</td>
      <td>${htmlEscape(fixed(row.discount_percent || 0))}%</td>
      <td>${htmlEscape(rupees(row.discount_amount || 0))}</td>
      <td>${htmlEscape(rupees(row.total_payable || 0))}</td>
      <td>${htmlEscape(rupees(row.paid || 0))}</td>
      <td>${htmlEscape(rupees(row.due || 0))}</td>
    </tr>`).join("")
    : `<tr><td colspan="8">No Data Found</td></tr>`;
  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>Sales History</title>
        <style>
          body { color: #20242a; font-family: Arial, Helvetica, sans-serif; margin: 24px; }
          .report-head { align-items: flex-start; display: flex; justify-content: space-between; margin-bottom: 14px; }
          .brand h1 { color: #0b5fad; font-size: 24px; margin: 0 0 4px; }
          .brand p, .software { color: #4b5563; font-size: 12px; margin: 3px 0; }
          .title { text-align: center; }
          .title h2 { font-size: 18px; letter-spacing: .02em; margin: 0 0 6px; text-transform: uppercase; }
          .title p { font-size: 13px; margin: 0; }
          table { border-collapse: collapse; font-size: 11px; width: 100%; }
          th, td { border: 1px solid #cfd5dc; padding: 7px 8px; text-align: left; vertical-align: top; }
          th { background: #edf2f6; font-weight: 700; }
          small { display: block; font-size: 10px; }
          .totals { display: grid; font-size: 12px; gap: 5px; justify-content: end; margin-top: 14px; }
          .totals div { display: flex; gap: 18px; justify-content: space-between; min-width: 230px; }
          @media print { body { margin: 10mm; } table { font-size: 9px; } }
        </style>
      </head>
      <body>
        <div class="report-head">
          <div class="brand">
            <h1>Hassan Pharmacy</h1>
            <p>DHA phase 2 extension</p>
          </div>
          <div class="title">
            <h2>Sales History</h2>
            <p>${htmlEscape(reportDate)}</p>
          </div>
          <div></div>
        </div>
        <table>
          <thead><tr><th>Invoice Number</th><th>Date</th><th>Total Amt</th><th>Discount (%)</th><th>Discount Amt</th><th>Total Payable</th><th>Paid</th><th>Due(s)</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="totals">
          <div><span>Total Sales:</span><strong>${htmlEscape(rupees(totals.grossSales || 0))}</strong></div>
          <div><span>Total Cost:</span><strong>${htmlEscape(rupees(totals.totalCost || 0))}</strong></div>
          <div><span>Total Discount:</span><strong>${htmlEscape(rupees(totals.totalDiscount || 0))}</strong></div>
          <div><span>Net Revenue:</span><strong>${htmlEscape(rupees(netRevenue))}</strong></div>
          <div><span>Pending:</span><strong>${htmlEscape(rupees(totals.pending || 0))}</strong></div>
        </div>
        <p class="software">Software By Hassan Pharmacy, Phone# 03324122333</p>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function printTable(title, rows, columns, options = {}) {
  const printableColumns = columns.filter(([key]) => key !== "actions");
  const tableHead = printableColumns.map(([, label]) => `<th>${htmlEscape(label)}</th>`).join("");
  const formatValue = options.formatValue || ((row, key) => formatCell(row[key]));
  const tableRows = rows.length
    ? rows.map((row) => `<tr>${printableColumns.map(([key]) => `<td>${htmlEscape(formatValue(row, key))}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${printableColumns.length}">No Data Found</td></tr>`;
  const summary = options.summary;
  const summaryHtml = summary ? `<div class="summary">
    <div><span>Gross Sales</span><strong>Rs. ${htmlEscape(money(summary.grossSales))}</strong></div>
    <div><span>Total Discount</span><strong>Rs. ${htmlEscape(money(summary.totalDiscount))}</strong></div>
    <div><span>Net Sales</span><strong>Rs. ${htmlEscape(money(summary.netSales))}</strong></div>
    <div><span>Total Cost</span><strong>Rs. ${htmlEscape(money(summary.totalCost))}</strong></div>
    <div><span>Net Revenue</span><strong>Rs. ${htmlEscape(money(summary.netRevenue))}</strong></div>
    <div><span>Pending</span><strong>Rs. ${htmlEscape(money(summary.pending))}</strong></div>
  </div>` : "";
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>${htmlEscape(title)}</title>
        <style>
          body { color: #1f2329; font-family: Arial, Helvetica, sans-serif; margin: 24px; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          .meta { color: #5f6873; font-size: 12px; margin-bottom: 18px; }
          .summary { border: 1px solid #cfd5dc; display: grid; grid-template-columns: repeat(6, 1fr); margin-bottom: 18px; }
          .summary div { border-right: 1px solid #cfd5dc; display: grid; gap: 4px; padding: 8px; }
          .summary div:last-child { border-right: 0; }
          .summary span { color: #5f6873; font-size: 10px; font-weight: 700; }
          .summary strong { font-size: 11px; }
          table { border-collapse: collapse; font-size: 10px; width: 100%; }
          th, td { border: 1px solid #cfd5dc; padding: 6px; text-align: left; vertical-align: top; }
          th { background: #edf2f6; font-weight: 700; }
          @media print { body { margin: 10mm; } table { font-size: 8px; } .summary { grid-template-columns: repeat(3, 1fr); } }
        </style>
      </head>
      <body>
        <h1>Hassan Pharmacy</h1>
        <div class="meta">${htmlEscape(title)} - ${htmlEscape(new Date().toLocaleString())}</div>
        ${summaryHtml}
        <table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function printStockPurchaseHistory(rows, columns, filters = {}) {
  const printableColumns = columns.filter(([key]) => key !== "actions");
  const tableHead = printableColumns.map(([, label]) => `<th>${htmlEscape(label)}</th>`).join("");
  const stockValue = (row, key) => row[key] == null ? "" : String(row[key]);
  const tableRows = rows.length
    ? rows.map((row) => `<tr>${printableColumns.map(([key]) => `<td>${htmlEscape(stockValue(row, key))}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${printableColumns.length}">No Data Found</td></tr>`;
  const filterBits = [
    filters.purchaseDate ? `Purchase Date: ${filters.purchaseDate}` : "",
    filters.search ? `Search: ${filters.search}` : "",
  ].filter(Boolean);
  const printWindow = window.open("", "_blank", "width=1400,height=900");
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>Stock History</title>
        <style>
          @page { size: landscape; margin: 8mm; }
          body { color: #1f2329; font-family: Arial, Helvetica, sans-serif; margin: 18px; }
          h1 { font-size: 22px; margin: 0; }
          h2 { font-size: 16px; margin: 3px 0 10px; }
          .meta { color: #5f6873; display: flex; font-size: 11px; gap: 14px; margin-bottom: 12px; }
          table { border-collapse: collapse; font-size: 9px; width: 100%; }
          th, td { border: 1px solid #cfd5dc; padding: 5px; text-align: left; vertical-align: top; }
          th { background: #edf2f6; font-weight: 700; }
          .software { color: #5f6873; font-size: 10px; margin-top: 16px; text-align: center; }
          @media print { body { margin: 0; } table { font-size: 8px; } }
        </style>
      </head>
      <body>
        <h1>Hassan Pharmacy</h1>
        <h2>Stock History</h2>
        <div class="meta">
          <span>Total Records: ${htmlEscape(String(rows.length))}</span>
          ${filterBits.map((bit) => `<span>${htmlEscape(bit)}</span>`).join("")}
        </div>
        <table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table>
        <p class="software">Software By Hassan Pharmacy, Phone# 03324122333</p>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function nameById(rows, id) {
  return rows.find((row) => Number(row.id) === Number(id))?.name || "-";
}

function batchNo(rows, id) {
  return rows.find((row) => Number(row.id) === Number(id))?.batch_no || "-";
}

function productStock(batches, productId, remaining) {
  return batches.filter((batch) => Number(batch.product_id) === Number(productId)).reduce((sum, batch) => sum + Number(remaining ? batch.stock_remaining : batch.stock_in || 0), 0);
}

function BatchModal({ data, row, close, apiCall, reload, onError }) {
  const editing = !!row;
  const [more, setMore] = useState(false);
  const [form, setForm] = useState(() => {
    const product = data.products.find((item) => Number(item.id) === Number(row?.product_id));
    return {
      stock_out: 0,
      supplier_outstanding: 0,
      batch_purchase_date: today(),
      expiry_reminder: "6 Months Before",
      stock_out_reminder: "30%",
      ...(row || {}),
      product_type: product?.type || row?.product_type || "medical",
      non_medical_sales_tax: row?.tax_amount || "",
    };
  });
  const initialSupplier = data.suppliers.find((item) => Number(item.id) === Number(row?.supplier_id));
  const initialProduct = data.products.find((item) => Number(item.id) === Number(row?.product_id));
  const [supplierQuery, setSupplierQuery] = useState(initialSupplier?.name || row?.supplier_name || "");
  const [productQuery, setProductQuery] = useState(initialProduct?.name || row?.product_name || "");
  const [quickAdd, setQuickAdd] = useState(null);
  const bodyRef = useRef(null);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const isNonMedical = form.product_type === "non-medical";
  const productOptions = data.products.filter((product) => product.type === form.product_type);

  function changeProductType(productType) {
    setMore(false);
    setForm((current) => ({ ...current, product_type: productType, product_id: "" }));
    setProductQuery("");
    requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: 0 }));
  }

  useEffect(() => {
    if (!more || !bodyRef.current) return;
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [more]);

  async function submit(event) {
    event.preventDefault();
    const matchedProduct = productOptions.find((product) => product.name.toLowerCase() === productQuery.trim().toLowerCase());
    const matchedSupplier = data.suppliers.find((supplier) => supplier.name.toLowerCase() === supplierQuery.trim().toLowerCase());
    const productId = form.product_id || matchedProduct?.id;
    const supplierId = form.supplier_id || matchedSupplier?.id;
    if (!productId) {
      onError(new Error("Select an existing product name or use + Add as New."));
      return;
    }
    const boxes = Number(form.box_quantity || 0);
    const units = Number(form.units_per_box || 0);
    const stock = form.stock_in ? Number(form.stock_in) : boxes * units;
    const { non_medical_sales_tax: nonMedicalSalesTax, ...batchPayload } = form;
    const stockOut = editing ? Number(row.stock_out || 0) : 0;
    const stockRemaining = editing ? stock - stockOut : stock;
    if (stockRemaining < 0) {
      onError(new Error("Total stock cannot be less than already sold stock."));
      return;
    }
    const normalizedPayload = {
      ...batchPayload,
      tax_amount: isNonMedical && nonMedicalSalesTax !== "" ? Number(nonMedicalSalesTax) : nullableNumber(form.tax_amount),
    };
    try {
      await apiCall(editing ? `/api/batches/${row.id}` : "/api/batches", { method: editing ? "PUT" : "POST", body: JSON.stringify({ ...normalizedPayload, product_id: Number(productId), supplier_id: isNonMedical ? null : nullableNumber(supplierId), shelf_id: nullableNumber(form.shelf_id), stock_in: stock, stock_remaining: stockRemaining, stock_out: stockOut, status: form.status || "active" }) });
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="batch-modal" onSubmit={submit}>
        <div className="modal-head"><h2>{editing ? "Edit Batch" : "Add Batch"}</h2><button type="button" onClick={close}><X /></button></div>
        <div className="modal-body" ref={bodyRef}>
          <div className="product-type"><strong>Product Type:</strong><label><input type="radio" checked={form.product_type === "medical"} onChange={() => changeProductType("medical")} /> Medical</label><label><input type="radio" checked={form.product_type === "non-medical"} onChange={() => changeProductType("non-medical")} /> Non Medical</label></div>
          <Field label="Bar Code" optional value={form.barcode || ""} onChange={(v) => set("barcode", v)} placeholder="Enter barcode." />
          {!isNonMedical ? <LookupField label="Supplier" value={form.supplier_id || ""} query={supplierQuery} onQueryChange={(value) => { setSupplierQuery(value); set("supplier_id", ""); }} onSelect={(supplier) => { set("supplier_id", supplier.id); setSupplierQuery(supplier.name); }} options={data.suppliers.filter((supplier) => supplier.status !== "inactive")} placeholder="Supplier" onAdd={() => setQuickAdd({ type: "supplier", initialName: supplierQuery })} /> : null}
          <LookupField label="Name" required value={form.product_id || ""} query={productQuery} onQueryChange={(value) => { setProductQuery(value); set("product_id", ""); }} onSelect={(product) => { set("product_id", product.id); setProductQuery(product.name); }} options={productOptions.filter((product) => product.status !== "reported")} placeholder="Name" onAdd={() => setQuickAdd({ type: "product", initialName: productQuery })} />
          <Field label="Batch No." required value={form.batch_no || ""} onChange={(v) => set("batch_no", v)} placeholder="Enter batch no." />
          <Field label="Total Boxes" type="number" value={form.box_quantity || ""} onChange={(v) => set("box_quantity", v)} placeholder="Add no. of boxes" />
          <Field label="Units per box" type="number" value={form.units_per_box || ""} onChange={(v) => set("units_per_box", v)} placeholder="Add no. of units per box" />
          <Field label="Total Stock" type="number" value={form.stock_in || ""} onChange={(v) => set("stock_in", v)} placeholder="Add Quantity" />
          <Linked label="Cost Price" a="Units Price" b="Boxes Price" av={form.cost_price || ""} bv={form.cost_price_per_box || ""} onA={(v) => set("cost_price", v)} onB={(v) => set("cost_price_per_box", v)} />
          <Linked label="Sell Price" a="Units Price" b="Boxes Price" av={form.sell_price || ""} bv={form.boxes_price || ""} onA={(v) => set("sell_price", v)} onB={(v) => set("boxes_price", v)} />
          <Field label="Stock Purchase Price Before Dis." type="number" value={form.stock_purchase_price_before_discount || ""} onChange={(v) => set("stock_purchase_price_before_discount", v)} placeholder="Add Price" />
          <Linked label="Extra Discount / Bonus" a="Percentage" b="Amount" av={form.discount_percentage || ""} bv={form.batch_discount || ""} onA={(v) => set("discount_percentage", v)} onB={(v) => set("batch_discount", v)} />
          <Field label="Stock Purchase Price" type="number" value={form.purchase_price || ""} onChange={(v) => set("purchase_price", v)} placeholder="Add Price" />
          <Linked label="Sales Tax" a="Percentage" b="Amount" av={form.tax_percentage || ""} bv={form.tax_amount || ""} onA={(v) => set("tax_percentage", v)} onB={(v) => set("tax_amount", v)} plus onPlus={() => set("tax_amount", roundMoney(Number(form.purchase_price_before_tax || form.stock_purchase_price_before_discount || form.purchase_price || 0) * (Number(form.tax_percentage || 0) / 100)))} />
          <Field label="Total Stock Price Before Tax" type="number" value={form.purchase_price_before_tax || ""} onChange={(v) => set("purchase_price_before_tax", v)} placeholder="Add Price" />
          <Field label="Expire Date" type="date" value={form.expire_date || ""} onChange={(v) => set("expire_date", v)} />
          <SelectField label={isNonMedical ? "Add Shelf" : "Shelf"} value={form.shelf_id || ""} onChange={(v) => set("shelf_id", v)} options={data.shelves} placeholder="Select Shelf" action={() => setQuickAdd({ type: "shelf" })} />
          {!isNonMedical ? <>
            <Field label="Production Date" optional type="date" value={form.production_date || ""} onChange={(v) => set("production_date", v)} />
            <Field label="Paid Amount" type="number" value={form.paid_amount || ""} onChange={(v) => set("paid_amount", v)} placeholder="Add Price" />
            <Field label="Supplier Outstanding" type="number" value={form.supplier_outstanding || ""} onChange={(v) => set("supplier_outstanding", v)} placeholder="Add Price" />
            <SelectField label="Purchasing Method" value={form.purchasing_method || ""} onChange={(v) => set("purchasing_method", v)} options={[{ id: "cash", name: "Cash" }, { id: "card", name: "Card" }, { id: "bank", name: "Bank Transfer" }]} placeholder="Select Payment Method" />
          </> : null}
          {more ? <div className="batch-extra-fields">
            {isNonMedical ? <Field label="Sales Tax" optional type="number" value={form.non_medical_sales_tax || ""} onChange={(v) => set("non_medical_sales_tax", v)} placeholder="Add sales tax" /> : null}
            <Field label="Maximum Discount %" optional type="number" value={form.max_discount_percentage || ""} onChange={(v) => set("max_discount_percentage", v)} placeholder="Discount %" />
            <Field label="Stock Purchase Date" optional type="date" value={form.batch_purchase_date || ""} onChange={(v) => set("batch_purchase_date", v)} />
            {!isNonMedical ? <Field label="Supplier Invoice No." optional value={form.supplier_invoice_no || ""} onChange={(v) => set("supplier_invoice_no", v)} placeholder="Enter Invoice no. of Supplier" /> : null}
            {isNonMedical ? <Field label="Production Date" optional type="date" value={form.production_date || ""} onChange={(v) => set("production_date", v)} /> : null}
            <SelectField label="Expiry Reminder" optional value={form.expiry_reminder || ""} onChange={(v) => set("expiry_reminder", v)} options={[{ id: "6 Months Before", name: "6 Months Before" }, { id: "3 Months Before", name: "3 Months Before" }]} />
            <SelectField label="Stock Out Reminder" optional value={form.stock_out_reminder || ""} onChange={(v) => set("stock_out_reminder", v)} options={[{ id: "30%", name: "30%" }, { id: "20%", name: "20%" }, { id: "10%", name: "10%" }]} />
          </div> : null}
        </div>
        <div className="modal-actions">
          <button className="show-more" type="button" onClick={() => setMore(!more)}><span>i</span> {more ? "Show Less" : "Show More"} <b>&rsaquo;</b></button>
          <div className="modal-submit"><button className="primary">{editing ? "Save" : "Add"}</button></div>
        </div>
      </form>
      {quickAdd ? <QuickAddModal type={quickAdd.type} initialName={quickAdd.initialName} productType={form.product_type} close={() => setQuickAdd(null)} apiCall={apiCall} reload={reload} onError={onError} onCreated={(created) => {
        if (quickAdd.type === "supplier") {
          set("supplier_id", created.id);
          setSupplierQuery(created.name);
        } else if (quickAdd.type === "shelf") {
          set("shelf_id", created.id);
        } else {
          set("product_id", created.id);
          setProductQuery(created.name);
        }
      }} /> : null}
    </div>
  );
}

function nullableNumber(value) {
  return value === "" || value == null ? null : Number(value);
}

function Field({ label, optional, type = "text", value, onChange, placeholder, required, disabled, hideLabel = false }) {
  return <label>{hideLabel ? null : <span className="field-title">{label} {optional ? <small>(Optional)</small> : null}</span>}<input aria-label={hideLabel ? label : undefined} disabled={disabled} required={required} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function PasswordField({ label, value, onChange, placeholder, required, disabled }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="password-field">
      <span className="field-title">{label}</span>
      <span className="password-input-wrap">
        <input disabled={disabled} required={required} type={visible ? "text" : "password"} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        <button type="button" className="password-toggle" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((current) => !current)}>
          {visible ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </span>
    </label>
  );
}

function TextareaField({ label, optional, value, onChange, placeholder, required }) {
  return <label><span className="field-title">{label} {optional ? <small>(Optional)</small> : null}</span><textarea required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, optional, value, onChange, options, placeholder, action, required, hideLabel = false }) {
  const [open, setOpen] = useState(false);
  const actionHandler = typeof action === "function" ? action : action?.onClick;
  const selected = options.find((option) => String(option.id) === String(value));
  return (
    <label className="lookup-field select-field">
      {hideLabel ? null : <span className="field-title">{label} {optional ? <small>(Optional)</small> : null}</span>}
      <div className={`input-action lookup-action ${action ? "" : "no-action"}`}>
        <input
          aria-label={label}
          required={required}
          readOnly
          value={selected?.name || value || ""}
          placeholder={placeholder || label}
          onClick={() => setOpen((current) => !current)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
        {action ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={actionHandler}>+ Add as New</button> : null}
        {open ? <div className="lookup-menu">
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(""); setOpen(false); }}>{placeholder || label}</button>
          {options.map((option) => <button type="button" key={option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.id); setOpen(false); }}>{option.name}</button>)}
        </div> : null}
      </div>
    </label>
  );
}

function LookupField({ label, optional, required, value, query, onQueryChange, onSelect, options, placeholder, addLabel = "+ Add as New", onAdd, hideLabel = false }) {
  const [open, setOpen] = useState(false);
  const filtered = options.filter((option) => option.name.toLowerCase().includes((query || "").toLowerCase())).slice(0, 8);
  return (
    <label className="lookup-field">
      {hideLabel ? null : <span className="field-title">{label} {optional ? <small>(Optional)</small> : null}</span>}
      <div className={`input-action lookup-action ${onAdd ? "" : "no-action"}`}>
        <input aria-label={hideLabel ? label : undefined} required={required} value={query} placeholder={placeholder ?? label} onFocus={() => setOpen(true)} onChange={(event) => { onQueryChange(event.target.value); setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 120)} />
        {onAdd ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onAdd}>{addLabel}</button> : null}
        {open && query ? <div className="lookup-menu">
          {filtered.length ? filtered.map((option) => <button type="button" key={option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(option); setOpen(false); }}>{option.name}</button>) : <div className="empty-small">No matches found</div>}
        </div> : null}
      </div>
      <input type="hidden" value={value || ""} readOnly />
    </label>
  );
}

function QuickAddModal({ type, initialName, productType, close, apiCall, reload, onError, onCreated }) {
  const config = {
    supplier: { title: "Add New Supplier", label: "Supplier Name/Company", placeholder: "Supplier name", endpoint: "/api/suppliers", payload: (name) => ({ name }) },
    product: { title: `Add ${productType === "medical" ? "Medical" : "Non Medical"} Product`, label: "Name", placeholder: "Product name", endpoint: "/api/products", payload: (name) => ({ name, type: productType }) },
    formula: { title: "Add New Formula Name", label: "Name", placeholder: "Formula name", endpoint: "/api/medicine-formulas", payload: (name) => ({ name }) },
    manufacturer: { title: "Add New Manufacturer", label: "Manufacturer Name", placeholder: "Manufacturer name", endpoint: "/api/manufacturers", payload: (name) => ({ name }) },
    category: { title: "Add New Category", label: "Category Name", placeholder: "Category name", endpoint: "/api/categories", payload: (name) => ({ name, type: productType }) },
    shelf: { title: "Add Shelf", label: "Shelf Name", placeholder: "Shelf A", endpoint: "/api/shelves", payload: (name) => ({ name }) },
  }[type];
  const [name, setName] = useState(initialName || "");
  async function submit(event) {
    event.preventDefault();
    try {
      const created = await apiCall(config.endpoint, {
        method: "POST",
        body: JSON.stringify(config.payload(name.trim())),
      });
      onCreated(created);
      close();
      await reload();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <div className="nested-modal-backdrop">
      <form className="quick-add-modal" onSubmit={submit}>
        <div className="modal-head"><h2>{config.title}</h2><button type="button" onClick={close}><X /></button></div>
        <div className="simple-modal-body">
          <Field label={config.label} required value={name} onChange={setName} placeholder={config.placeholder} />
        </div>
        <div className="modal-actions"><span /><button className="primary">Add</button></div>
      </form>
    </div>
  );
}

function Linked({ label, a, b, av, bv, onA, onB, plus, onPlus }) {
  return <label><span className="field-title">{label}</span><div className={plus ? "tax-inputs" : "linked-inputs"}><input type="number" value={av} placeholder={a} onChange={(event) => onA(event.target.value)} /><span>&harr;</span><input type="number" value={bv} placeholder={b} onChange={(event) => onB(event.target.value)} />{plus ? <button type="button" onClick={onPlus}>+</button> : null}</div></label>;
}
