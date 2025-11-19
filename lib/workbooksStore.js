const STORE_KEY = Symbol.for("skillLab.workbooks");

function getStore() {
  const existing = globalThis[STORE_KEY];
  if (!existing) {
    const map = new Map();
    globalThis[STORE_KEY] = map;
    return map;
  }
  return existing;
}

export function saveWorkbook(entry) {
  const store = getStore();
  store.set(entry.id, entry);
  return entry;
}

export function getWorkbook(id) {
  const store = getStore();
  return store.get(id) ?? null;
}