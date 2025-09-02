// DEBUG VERSION - Replace your src/content/content.js with this temporarily

console.log("[AI Context Manager] Content script starting...");
console.log("[AI Context Manager] Current URL:", window.location.href);
console.log("[AI Context Manager] Current host:", window.location.host);

const SUPPORTED_SITES = [
  "chat.openai.com",
  "claude.ai", 
  "gemini.google.com",
  "perplexity.ai",
  "www.perplexity.ai"
];

const BUTTON_ID = "ai-context-manager-inline-button";
const MENU_ID = "ai-context-manager-inline-menu";

function siteSupported() {
  const host = window.location.host;
  console.log("[AI Context Manager] Checking host:", host);
  const supported = SUPPORTED_SITES.some(h => host.includes(h));
  console.log("[AI Context Manager] Site supported:", supported);
  return supported;
}

function ensureButton() {
  console.log("[AI Context Manager] ensureButton() called");
  
  if (document.getElementById(BUTTON_ID)) {
    console.log("[AI Context Manager] Button already exists");
    return;
  }
  
  console.log("[AI Context Manager] Creating button...");
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.textContent = "Context ▼";
  btn.style.position = "fixed";
  btn.style.bottom = "12px";
  btn.style.right = "12px";
  btn.style.zIndex = "2147483647";
  btn.style.padding = "6px 10px";
  btn.style.fontSize = "12px";
  btn.style.background = "#444";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "4px";
  btn.style.cursor = "pointer";
  btn.setAttribute("aria-label", "Open context menu");
  btn.addEventListener("click", toggleMenu);
  
  // Make sure body exists before appending
  if (document.body) {
    document.body.appendChild(btn);
    console.log("[AI Context Manager] Button added to page!");
  } else {
    console.log("[AI Context Manager] Body not ready, waiting...");
    setTimeout(() => {
      if (document.body) {
        document.body.appendChild(btn);
        console.log("[AI Context Manager] Button added to page (delayed)!");
      } else {
        console.error("[AI Context Manager] Could not find document.body");
      }
    }, 1000);
  }
}

function toggleMenu() {
  console.log("[AI Context Manager] toggleMenu() called");
  const existing = document.getElementById(MENU_ID);
  if (existing) {
    existing.remove();
    return;
  }
  
  // Simple test menu first
  const menu = document.createElement("div");
  menu.id = MENU_ID;
  menu.textContent = "Context menu works! (This is a test)";
  Object.assign(menu.style, {
    position: "fixed",
    bottom: "48px",
    right: "12px",
    minWidth: "240px",
    background: "#222",
    color: "#eee",
    fontSize: "12px",
    border: "1px solid #555",
    borderRadius: "4px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
    padding: "8px",
    zIndex: "2147483647"
  });
  
  document.body.appendChild(menu);
  
  // Close menu on outside click
  setTimeout(() => {
    const handler = (e) => {
      if (!menu.contains(e.target) && e.target.id !== BUTTON_ID) {
        menu.remove();
        document.removeEventListener("mousedown", handler);
      }
    };
    document.addEventListener("mousedown", handler);
  }, 0);
}

// Multiple ways to ensure the script runs
console.log("[AI Context Manager] Document ready state:", document.readyState);

if (siteSupported()) {
  console.log("[AI Context Manager] Site is supported, creating button...");
  
  // Try immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureButton);
  } else {
    ensureButton();
  }
  
  // Also try after a short delay as backup
  setTimeout(ensureButton, 2000);
} else {
  console.log("[AI Context Manager] Site not supported, skipping button creation");
}
