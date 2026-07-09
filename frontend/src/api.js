const TOKEN_KEY = "hassanPharmacyToken";
const USER_KEY = "hassanPharmacyUser";
const CONFIGURED_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const API_BASE_URL = typeof window !== "undefined"
  && window.location.hostname.endsWith("vercel.app")
  && CONFIGURED_API_BASE_URL.includes("onrender.com")
  ? ""
  : CONFIGURED_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 75000;
const GET_RETRY_ATTEMPTS = 2;
const GET_RETRY_DELAY_MS = 1000;
const RETRYABLE_POST_PATHS = ["/api/auth/login"];
const getCache = new Map();
const inflightGets = new Map();

const STABLE_LOOKUP_TTL_MS = 10 * 60 * 1000;
const PROFILE_TTL_MS = 5 * 60 * 1000;
const PRODUCT_LOOKUP_TTL_MS = 60 * 1000;
const BATCH_LOOKUP_TTL_MS = 10 * 1000;
const SALE_SEARCH_TTL_MS = 5 * 1000;

const STABLE_LOOKUP_PATHS = new Set([
  "/api/suppliers",
  "/api/shelves",
  "/api/categories",
  "/api/medicine-formulas",
  "/api/manufacturers",
  "/api/expense-categories",
  "/api/return-policies",
  "/api/return-notes",
]);

function apiUrl(path) {
  if (!API_BASE_URL || /^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function parsedApiPath(path) {
  return new URL(apiUrl(path), typeof window === "undefined" ? "http://localhost" : window.location.origin);
}

function cacheKey(path, token) {
  return `${token || "anon"} ${apiUrl(path)}`;
}

function cloneBody(body) {
  if (body == null) return body;
  if (typeof structuredClone === "function") return structuredClone(body);
  return JSON.parse(JSON.stringify(body));
}

function cacheTtlForPath(path) {
  const url = parsedApiPath(path);
  const pathname = url.pathname;
  if (pathname === "/api/pharmacy-profile") return PROFILE_TTL_MS;
  if (STABLE_LOOKUP_PATHS.has(pathname)) return STABLE_LOOKUP_TTL_MS;
  if (pathname === "/api/products") {
    const limit = Number(url.searchParams.get("limit") || 0);
    return url.searchParams.has("q") || (limit > 0 && limit <= 20) ? PRODUCT_LOOKUP_TTL_MS : 0;
  }
  if (pathname === "/api/batches") {
    const limit = Number(url.searchParams.get("limit") || 0);
    return url.searchParams.has("q") || url.searchParams.has("product_id") || (limit > 0 && limit <= 20) ? BATCH_LOOKUP_TTL_MS : 0;
  }
  if (pathname === "/api/sale-search") return SALE_SEARCH_TTL_MS;
  return 0;
}

function clearApiCache() {
  getCache.clear();
  inflightGets.clear();
}

export function getStoredSession() {
  return {
    token: localStorage.getItem(TOKEN_KEY) || "",
    user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
  };
}

export function storeSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearApiCache();
}

export async function api(path, options = {}, token = "") {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  const method = (options.method || "GET").toUpperCase();
  const ttl = method === "GET" && !options.noCache ? cacheTtlForPath(path) : 0;
  const key = ttl ? cacheKey(path, token) : "";
  if (ttl) {
    const cached = getCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cloneBody(cached.body);
    if (cached) getCache.delete(key);
    if (inflightGets.has(key)) return cloneBody(await inflightGets.get(key));
  }
  const allowRetry = method === "GET" || (method === "POST" && RETRYABLE_POST_PATHS.some((retryPath) => path.startsWith(retryPath)));
  const maxAttempts = allowRetry && !options.signal ? GET_RETRY_ATTEMPTS + 1 : 1;
  const requestPromise = (async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        response = await fetch(apiUrl(path), { ...options, headers, signal: options.signal || controller.signal });
        break;
      } catch (error) {
        const retryable = (error.name === "AbortError" || error instanceof TypeError) && attempt < maxAttempts;
        if (retryable) {
          await new Promise((resolve) => setTimeout(resolve, GET_RETRY_DELAY_MS * attempt));
          continue;
        }
        if (error.name === "AbortError") throw new Error("Server is taking too long to respond. Please try again in a moment.");
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      const detail = body?.detail || body || response.statusText;
      const message = Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : detail;
      const error = new Error(response.status === 401 ? "Session expired. Please sign in again." : message);
      error.status = response.status;
      throw error;
    }
    if (method !== "GET") clearApiCache();
    if (ttl) getCache.set(key, { body: cloneBody(body), expiresAt: Date.now() + ttl });
    return body;
  })();
  if (ttl) inflightGets.set(key, requestPromise);
  try {
    return cloneBody(await requestPromise);
  } finally {
    if (ttl) inflightGets.delete(key);
  }
}
