import { getContexts, touchContext, addContext } from "../storage/contexts.js";
import { STORAGE_KEY } from "../common/constants.js";

// Seed a sample context on first install if none exist
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    console.log("[AI Context Manager] Installed.");
    const existing = await getContexts();
    if (existing.length === 0) {
      await addContext({
        title: "Sample Context",
        body: "Welcome! Edit or delete this sample, then add your own frequently used instructions."
      });
      console.log("[AI Context Manager] Seeded sample context.");
    }
  }
});

// Central message handling so content script does NOT depend on popup being open
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "REQUEST_CONTEXTS") {
    getContexts().then((list) => sendResponse(list));
    return true; // async
  }
  if (msg?.type === "TOUCH_CONTEXT" && msg.id) {
    touchContext(msg.id).then(() => sendResponse({ ok: true }));
    return true;
  }
});
