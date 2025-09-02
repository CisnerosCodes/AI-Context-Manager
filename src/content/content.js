// Self-contained content script (no top-level import) to avoid ES module issues in MV3 content scripts.

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
  return SUPPORTED_SITES.some(h => host.includes(h));
}

function ensureButton() {
  if (document.getElementById(BUTTON_ID)) return;
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
  document.body.appendChild(btn);
}

function toggleMenu() {
  const existing = document.getElementById(MENU_ID);
  if (existing) {
    existing.remove();
    return;
  }
  // Request contexts from background
  chrome.runtime.sendMessage({ type: "REQUEST_CONTEXTS" }, (ctxs) => {
    if (chrome.runtime.lastError) {
      console.warn("[AI Context Manager] Message error:", chrome.runtime.lastError.message);
      renderMenu([]);
      return;
    }
    renderMenu(Array.isArray(ctxs) ? ctxs : []);
  });
}

function renderMenu(contexts) {
  const menu = document.createElement("div");
  menu.id = MENU_ID;
  Object.assign(menu.style, {
    position: "fixed",
    bottom: "48px",
    right: "12px",
    minWidth: "240px",
    maxHeight: "300px",
    overflowY: "auto",
    background: "#222",
    color: "#eee",
    fontSize: "12px",
    border: "1px solid #555",
    borderRadius: "4px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
    padding: "4px",
    zIndex: "2147483647"
  });

  if (contexts.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No contexts. Open the extension to add some.";
    empty.style.padding = "8px";
    menu.appendChild(empty);
  } else {
    contexts.forEach(c => {
      const item = document.createElement("div");
      item.textContent = c.title;
      item.style.padding = "6px 8px";
      item.style.cursor = "pointer";
      item.style.borderRadius = "3px";
      item.title = c.body.length > 200 ? c.body.slice(0, 200) + "…" : c.body;

      item.addEventListener("click", () => {
        injectText(c.body);
        chrome.runtime.sendMessage({ type: "TOUCH_CONTEXT", id: c.id });
        menu.remove();
      });
      item.addEventListener("mouseover", () => { item.style.background = "#444"; });
      item.addEventListener("mouseout", () => { item.style.background = "transparent"; });
      menu.appendChild(item);
    });
  }

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

  document.body.appendChild(menu);
}

function injectText(text) {
  const active = document.activeElement;
  if (active && (active.tagName === "TEXTAREA" || active.isContentEditable)) {
    if (active.tagName === "TEXTAREA") {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      const before = active.value.slice(0, start);
      const after = active.value.slice(end);
      active.value = before + text + after;
      active.selectionStart = active.selectionEnd = start + text.length;
      active.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      // ContentEditable
      try {
        document.execCommand("insertText", false, text);
      } catch {
        active.appendChild(document.createTextNode(text));
      }
    }
  } else {
    navigator.clipboard.writeText(text).catch(() => {});
    alert("Context copied to clipboard (focus an input to insert directly).");
  }
}

if (siteSupported()) {
  ensureButton();
}
