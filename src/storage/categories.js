import { STORAGE_KEY } from "../common/constants.js";

const CATEGORIES_KEY = "categories:v1";

function now() { return Date.now(); }

async function loadAllCategories() {
  return new Promise(resolve => {
    chrome.storage.local.get([CATEGORIES_KEY], data => {
      resolve(Array.isArray(data[CATEGORIES_KEY]) ? data[CATEGORIES_KEY] : []);
    });
  });
}

async function saveAllCategories(list) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [CATEGORIES_KEY]: list }, () => resolve());
  });
}

export async function getCategories() {
  const list = await loadAllCategories();
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCategory({ name }) {
  const list = await loadAllCategories();
  
  // Check if category name already exists
  if (list.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Category name already exists");
  }
  
  const item = {
    id: crypto.randomUUID(),
    name: name?.trim() || "Untitled Category",
    createdAt: now(),
    updatedAt: now()
  };
  list.push(item);
  await saveAllCategories(list);
  return item;
}

export async function updateCategory(id, updates) {
  const list = await loadAllCategories();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return null;
  
  // Check if new name conflicts with existing categories
  if (updates.name) {
    const nameConflict = list.some(cat => 
      cat.id !== id && cat.name.toLowerCase() === updates.name.toLowerCase()
    );
    if (nameConflict) {
      throw new Error("Category name already exists");
    }
  }
  
  list[idx] = { ...list[idx], ...updates, updatedAt: now() };
  await saveAllCategories(list);
  return list[idx];
}

export async function deleteCategory(id) {
  const list = await loadAllCategories();
  const next = list.filter(c => c.id !== id);
  await saveAllCategories(next);
  return next.length !== list.length;
}
