const TOKEN_KEY = "hassanPharmacyToken";
const USER_KEY = "hassanPharmacyUser";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 75000;
const GET_RETRY_ATTEMPTS = 2;
const GET_RETRY_DELAY_MS = 1000;

function apiUrl(path) {
  if (!API_BASE_URL || /^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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
}

export async function api(path, options = {}, token = "") {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  const method = (options.method || "GET").toUpperCase();
  const maxAttempts = method === "GET" && !options.signal ? GET_RETRY_ATTEMPTS + 1 : 1;
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
  return body;
}
