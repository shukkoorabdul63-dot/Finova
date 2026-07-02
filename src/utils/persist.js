// Small helper for persisting app state to localStorage. Fails silently if
// storage is unavailable (private browsing, quota exceeded, etc.) — Finova
// should never crash just because persistence didn't work.

export function loadPersisted(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function savePersisted(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore — e.g. private browsing mode with storage disabled
  }
}
