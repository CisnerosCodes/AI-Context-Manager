// Working content script - replace your debug version with this

const SUPPORTED_SITES = [
  "claude.ai"  // Start with just Claude since that's working
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
  
  if (document.body) {
    document.body.appendChild(btn);
    console.log("[AI Context Manager] Button added successfully!");
  } else {
    setTimeout(() => {
      if (document.body) {
        document.body.appendChild(btn);
        console.log("[AI Context Manager] Button added (delayed)!");
      }
    }, 1000);
  }
}

function toggleMenu() {
  const existing = document.getElementById(MENU_ID);
  if (existing) {
    existing.remove();
    return;
  }
  
  // Request contexts from background script
  chrome.runtime.sendMessage({ type: "REQUEST_CONTEXTS" }, (contexts) => {
    if (chrome.runtime.lastError) {
      console.warn("[AI Context Manager] Message error:", chrome.runtime.lastError.message);
      renderMenu([]);
      return;
    }
    renderMenu(Array.isArray(contexts) ? contexts : []);
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
    empty.textContent = "No contexts yet. Click the extension icon to add some.";
    empty.style.padding = "8px";
    empty.style.color = "#aaa";
    menu.appendChild(empty);
  } else {
    contexts.forEach(context => {
      const item = document.createElement("div");
      item.textContent = context.title;
      item.style.padding = "6px 8px";
      item.style.cursor = "pointer";
      item.style.borderRadius = "3px";
      item.title = context.body.length > 200 ? context.body.slice(0, 200) + "…" : context.body;

      item.addEventListener("click", () => {
        injectText(context.body);
        // Update usage tracking
        chrome.runtime.sendMessage({ type: "TOUCH_CONTEXT", id: context.id });
        menu.remove();
      });
      
      item.addEventListener("mouseover", () => { 
        item.style.background = "#444"; 
      });
      item.addEventListener("mouseout", () => { 
        item.style.background = "transparent"; 
      });
      
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
      // ContentEditable (like Claude's input)
      try {
        document.execCommand("insertText", false, text);
      } catch (error) {
        // Fallback
        const textNode = document.createTextNode(text);
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          active.appendChild(textNode);
        }
      }
    }
    
    // Trigger any change events that the site might be listening for
    active.dispatchEvent(new Event("input", { bubbles: true }));
    active.dispatchEvent(new Event("change", { bubbles: true }));
    
  } else {
    // Fallback: copy to clipboard and alert
    navigator.clipboard.writeText(text).then(() => {
      // Create a temporary notification instead of alert
      const notification = document.createElement("div");
      notification.textContent = "Context copied to clipboard! Click in the input field to paste.";
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: #fff;
        padding: 12px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 2147483647;
        max-width: 300px;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }).catch(() => {
      alert("Context ready! Focus an input field to insert text.");
    });
  }
}

// Initialize
if (siteSupported()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureButton);
  } else {
    ensureButton();
  }
  
  // Backup timer
  setTimeout(ensureButton, 2000);
}
