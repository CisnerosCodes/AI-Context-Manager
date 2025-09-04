import { STORAGE_KEY } from "../common/constants.js";

function now() { return Date.now(); }

function rawLoad() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], data => {
      resolve(Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : []);
    });
  });
}

function rawSave(list) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: list }, () => resolve());
  });
}

/**
 * Migrate older records to include:
 * - categoryId (null)
 * - uses (0)
 * - updatedAt (if missing, fallback)
 */
function migrate(list) {
  let changed = false;
  const next = list.map(item => {
    let updated = { ...item };
    if (updated.categoryId === undefined) {
      updated.categoryId = null;
      changed = true;
    }
    if (typeof updated.uses !== "number") {
      updated.uses = 0;
      changed = true;
    }
    if (typeof updated.updatedAt !== "number") {
      updated.updatedAt = typeof updated.createdAt === "number" ? updated.createdAt : now();
      changed = true;
    }
    return updated;
  });
  return { list: next, changed };
}

async function loadAll() {
  const raw = await rawLoad();
  const { list, changed } = migrate(raw);
  if (changed) await rawSave(list);
  return list;
}

async function saveAll(list) {
  await rawSave(list);
}

export async function getContexts() {
  const list = await loadAll();
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getContextsByCategory(categoryId) {
  const list = await getContexts();
  return list.filter(c => c.categoryId === categoryId);
}

export async function addContext({ title, body, categoryId = null }) {
  const list = await loadAll();
  const item = {
    id: crypto.randomUUID(),
    title: title?.trim() || "Untitled",
    body: body || "",
    categoryId: categoryId || null,
    uses: 0,
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

  const safe = { ...updates };
  delete safe.id;
  delete safe.createdAt;

  if ("uses" in safe && typeof safe.uses !== "number") {
    delete safe.uses;
  }

  list[idx] = {
    ...list[idx],
    ...safe,
    updatedAt: now()
  };
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
  const list = await loadAll();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return;
  list[idx].uses = (list[idx].uses || 0) + 1;
  list[idx].updatedAt = now();
  await saveAll(list);
}

export async function stripCategoryFromContexts(categoryId) {
  const list = await loadAll();
  let changed = false;
  for (const ctx of list) {
    if (ctx.categoryId === categoryId) {
      ctx.categoryId = null;
      ctx.updatedAt = now();
      changed = true;
    }
  }
  if (changed) await saveAll(list);
}
