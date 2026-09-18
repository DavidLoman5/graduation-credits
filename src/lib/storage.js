export const STORE_KEY = "nycu-grad-credits-v2";

export function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

export function persist(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch { /* 無痕模式或容量已滿，不影響當次使用 */ }
}
