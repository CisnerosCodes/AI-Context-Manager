/**
 * AI Context Manager - Background Service Worker
 * Handles initialization and context metadata updates.
 */
const STORAGE_KEY = 'contexts';
const SCHEMA_VERSION = 1; // for future migrations

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[AI Context Manager] onInstalled:', details.reason);
  const data = await chrome.storage.local.get([STORAGE_KEY, 'schemaVersion']);

  if (!data.schemaVersion) {
    await chrome.storage.local.set({ schemaVersion: SCHEMA_VERSION });
  }

  if (!data[STORAGE_KEY] || !Array.isArray(data[STORAGE_KEY])) {
    const sampleContext = {
      id: generateId(),
      title: 'Sample Context',
      content: 'Welcome! This is a sample context. Edit or delete it, then add your own frequently used prompts or instructions.',
      category: 'personal',
      created: Date.now(),
      lastUsed: null
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: [sampleContext] });
    console.log('[AI Context Manager] Initialized with sample context.');
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateLastUsed' && message.contextId) {
    updateLastUsed(message.contextId, message.timestamp || Date.now())
      .then(success => sendResponse({ success }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async
  }
});

async function updateLastUsed(contextId, timestamp) {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const contexts = data[STORAGE_KEY] || [];
  const idx = contexts.findIndex(c => c.id === contextId);
  if (idx === -1) return false;
  contexts[idx].lastUsed = timestamp;
  contexts.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  await chrome.storage.local.set({ [STORAGE_KEY]: contexts });
  return true;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}