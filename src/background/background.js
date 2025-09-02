import { STORAGE_KEY } from "../common/constants.js";

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    console.log("[AI Context Manager] Installed.");
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_CONTEXTS") {
    // Retrieve contexts from storage
    chrome.storage.local.get([STORAGE_KEY], (data) => {
      const contexts = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
      // Sort by most recently used (updatedAt)
      const sorted = contexts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      sendResponse(sorted);
    });
    return true; // Will respond asynchronously
  }
  
  if (message.type === "TOUCH_CONTEXT") {
    // Update lastUsed timestamp for the context
    chrome.storage.local.get([STORAGE_KEY], (data) => {
      const contexts = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
      const contextIndex = contexts.findIndex(c => c.id === message.id);
      
      if (contextIndex !== -1) {
        contexts[contextIndex] = {
          ...contexts[contextIndex],
          updatedAt: Date.now()
        };
        
        chrome.storage.local.set({ [STORAGE_KEY]: contexts }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false });
      }
    });
    return true; // Will respond asynchronously
  }
});