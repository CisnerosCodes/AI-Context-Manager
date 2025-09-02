import { STORAGE_KEY } from "../common/constants.js";

function now() { return Date.now(); }

async function loadAll() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], data => {
      resolve(Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : []);
    });
  });
}

async function saveAll(list) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: list }, () => resolve());
  });
}

export async function getContexts() {
  const list = await loadAll();
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function addContext({ title, body }) {
  const list = await loadAll();
  const item = {
    id: crypto.randomUUID(),
    title: title?.trim() || "Untitled",
    body: body || "",
    createdAt: now(),
    updatedAt: now()
  };
  list.push(item);
  await saveAll(list);
  return item;
}

export async function updateContext(id, updates) {
  const list = await loadAll();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates, updatedAt: now() };
  await saveAll(list);
  return list[idx];
}

export async function deleteContext(id) {
  const list = await loadAll();
  const next = list.filter(c => c.id !== id);
  await saveAll(next);
  return next.length !== list.length;
}

export async function touchContext(id) {
  return updateContext(id, {});
}