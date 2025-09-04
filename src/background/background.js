import { getContexts, touchContext, addContext } from "../storage/contexts.js";
import { getCategories } from "../storage/categories.js";

// Centralized logging helper
const LOG_PREFIX = "[AI Context Manager][BG]";

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details.reason === "install") {
      console.log(`${LOG_PREFIX} Installed.`);
      const existing = await getContexts();
      if (existing.length === 0) {
        await addContext({
          title: "Sample Context",
            body: "Welcome! Edit or delete this sample, then add your own frequently used instructions."
        });
        console.log(`${LOG_PREFIX} Seeded sample context.`);
      }
    }
  } catch (e) {
    console.error(`${LOG_PREFIX} onInstalled error:`, e);
  }
});

// Handle messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "REQUEST_CONTEXTS") {
        const list = await getContexts();
        sendResponse(list);
        return;
      }
      if (msg?.type === "REQUEST_CATEGORIES") {
        const list = await getCategories();
        sendResponse(list);
        return;
      }
      if (msg?.type === "TOUCH_CONTEXT" && msg.id) {
        await touchContext(msg.id);
        sendResponse({ ok: true });
        return;
      }
    } catch (e) {
      console.error(`${LOG_PREFIX} Handler error for ${msg?.type}:`, e);
      sendResponse({ error: true, message: e.message });
    }
  })();
  return true; // keep channel open for async
});
