chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    console.log("[AI Context Manager] Installed.");
  }
});