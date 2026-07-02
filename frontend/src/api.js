const TOKEN_KEY = "hassanPharmacyToken";
const USER_KEY = "hassanPharmacyUser";

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
  const response = await fetch(path, { ...options, headers });
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
