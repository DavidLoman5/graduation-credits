/* ================================================================== *
 * 雲端同步：與自架 API（server/）溝通
 * 兩個環境變數都有設才啟用，否則網站維持純 localStorage。
 * ================================================================== */

const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
export const cloudEnabled = Boolean(API && GOOGLE_CLIENT_ID);

const SESSION_KEY = "grad-credits-session";

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function storeSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* 無痕模式：只影響下次開啟要重新登入 */ }
}

export class AuthError extends Error {}

async function call(path, { token, ...opts } = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthError(body.error || "未登入");
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

/** 用 Google 給的 ID token 換本站 session，回傳 { token, user } */
export async function loginWithGoogle(credential) {
  const s = await call("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
  storeSession(s);
  return s;
}

export function logout() {
  storeSession(null);
  window.google?.accounts.id.disableAutoSelect();
}

export const fetchData = (token) => call("/api/data", { token });

export const saveData = (token, data) =>
  call("/api/data", { token, method: "PUT", body: JSON.stringify({ data }) });
