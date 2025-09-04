// Content script – mounts inline context button/menu on supported AI sites.

const SUPPORTED_SITES = [
  "claude.ai",
  "chat.openai.com",
  "chatgpt.com",
  "gemini.google.com",
  "perplexity.ai"
];

const BUTTON_ID = "ai-context-manager-inline-button";
const MENU_ID = "ai-context-manager-inline-menu";

const LOG_PREFIX = "[AI Context Manager]";
const OBSERVER_FLAG = "__AI_CTX_OBSERVER";

console.log(`${LOG_PREFIX} Content script loaded on ${location.host}`);

function siteSupported() {
  const host = window.location.host;
  return SUPPORTED_SITES.some(h => host.includes(h));
}

function ensureButton() {
  if (!siteSupported()) return;
  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.textContent = "Context ▼";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "12px",
    right: "12px",
    zIndex: "2147483647",
    padding: "6px 10px",
    fontSize: "12px",
    background: "#444",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif"
  });
  btn.setAttribute("aria-label", "Open context menu");
  btn.addEventListener("click", toggleMenu);

  if (document.body) {
    document.body.appendChild(btn);
    console.log(`${LOG_PREFIX} Button injected.`);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (!document.getElementById(BUTTON_ID)) {
        document.body.appendChild(btn);
        console.log(`${LOG_PREFIX} Button injected after DOMContentLoaded.`);
      }
    });
  }
}

function toggleMenu() {
  const existing = document.getElementById(MENU_ID);
  if (existing) {
    existing.remove();
    return;
  }
  document.querySelectorAll(`#${MENU_ID}`).forEach(n => n.remove());

  if (!chrome?.runtime?.sendMessage) {
    console.warn(`${LOG_PREFIX} chrome.runtime unavailable; showing empty menu.`);
    renderMenu([]);
    return;
  }

  chrome.runtime.sendMessage({ type: "REQUEST_CONTEXTS" }, (contexts) => {
    if (chrome.runtime.lastError) {
      console.error(`${LOG_PREFIX} Message error:`, chrome.runtime.lastError.message);
      renderMenu([]);
      return;
    }
    if (!Array.isArray(contexts)) {
      console.warn(`${LOG_PREFIX} Invalid contexts payload`, contexts);
      renderMenu([]);
      return;
    }
    renderMenu(contexts);
  });
}

function renderMenu(contexts) {
  const menu = document.createElement("div");
  menu.id = MENU_ID;
  Object.assign(menu.style, {
    position: "fixed",
    bottom: "48px",
    right: "12px",
    minWidth: "260px",
    maxHeight: "300px",
    overflowY: "auto",
    background: "#222",
    color: "#eee",
    fontSize: "12px",
    fontFamily: "system-ui, sans-serif",
    border: "1px solid #555",
    borderRadius: "4px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
    padding: "4px",
    zIndex: "2147483647"
  });

  if (!contexts.length) {
    const empty = document.createElement("div");
    if (!chrome?.runtime) {
      empty.innerHTML = `
        <div style="padding:8px;color:#ff8080;">
          Extension communication error.<br>Reload page or extension.
        </div>
      `;
    } else {
      empty.textContent = "No contexts yet. Open the extension popup to create one.";
      empty.style.padding = "8px";
      empty.style.color = "#bbb";
    }
    menu.appendChild(empty);
  } else {
    contexts.forEach(ctx => {
      const item = document.createElement("div");
      item.textContent = ctx.title;
      Object.assign(item.style, {
        padding: "6px 8px",
        cursor: "pointer",
        borderRadius: "3px"
      });
      item.title = ctx.body.length > 240 ? ctx.body.slice(0, 240) + "…" : ctx.body;

      item.addEventListener("click", () => {
        injectText(ctx.body);
        if (chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: "TOUCH_CONTEXT", id: ctx.id }).catch?.(()=>{});
        }
        menu.remove();
      });
      item.addEventListener("mouseover", () => { item.style.background = "#444"; });
      item.addEventListener("mouseout", () => { item.style.background = "transparent"; });
      menu.appendChild(item);
    });
  }

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
      try {
        document.execCommand("insertText", false, text);
      } catch {
        const textNode = document.createTextNode(text);
        const sel = window.getSelection();
        if (sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          active.appendChild(textNode);
        }
      }
      active.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const note = document.createElement("div");
      note.textContent = "Context copied. Paste into the input (Ctrl/Cmd+V).";
      note.style.cssText = `
        position:fixed;top:20px;right:20px;background:#333;color:#fff;
        padding:10px 14px;border-radius:6px;font-size:13px;z-index:2147483647;
        box-shadow:0 2px 6px rgba(0,0,0,.4);
      `;
      document.body.appendChild(note);
      setTimeout(()=>note.remove(), 3000);
    }).catch(()=> alert("Context copied. Paste into the input."));
  }
}

function installMutationObserver() {
  if (window[OBSERVER_FLAG]) return;
  window[OBSERVER_FLAG] = true;
  const mo = new MutationObserver(() => {
    if (!document.getElementById(BUTTON_ID)) ensureButton();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

if (siteSupported()) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureButton);
  } else {
    ensureButton();
  }
  setTimeout(ensureButton, 800);
  setTimeout(ensureButton, 2500);
  installMutationObserver();
}
