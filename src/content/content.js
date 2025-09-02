// Fixed content script - handles chrome.runtime availability issues

const SUPPORTED_SITES = [
  "claude.ai"
];

const BUTTON_ID = "ai-context-manager-inline-button";
const MENU_ID = "ai-context-manager-inline-menu";

console.log("[AI Context Manager] Content script loading...");
console.log("[AI Context Manager] chrome object:", typeof chrome);
console.log("[AI Context Manager] chrome.runtime:", typeof chrome?.runtime);

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
  console.log("[AI Context Manager] toggleMenu() called");
  
  const existing = document.getElementById(MENU_ID);
  if (existing) {
    console.log("[AI Context Manager] Removing existing menu");
    existing.remove();
    return;
  }
  
  // Check if chrome.runtime is available
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    console.error("[AI Context Manager] Chrome runtime not available, showing fallback menu");
    renderMenu([]);
    return;
  }
  
  console.log("[AI Context Manager] Requesting contexts from background...");
  
  try {
    chrome.runtime.sendMessage({ type: "REQUEST_CONTEXTS" }, (contexts) => {
      console.log("[AI Context Manager] Response received:", contexts);
      
      if (chrome.runtime.lastError) {
        console.error("[AI Context Manager] Message error:", chrome.runtime.lastError.message);
        renderMenu([]);
        return;
      }
      
      if (!Array.isArray(contexts)) {
        console.warn("[AI Context Manager] Invalid contexts response:", contexts);
        renderMenu([]);
        return;
      }
      
      console.log("[AI Context Manager] Rendering menu with", contexts.length, "contexts");
      renderMenu(contexts);
    });
  } catch (error) {
    console.error("[AI Context Manager] Error sending message:", error);
    renderMenu([]);
  }
}

function renderMenu(contexts) {
  console.log("[AI Context Manager] renderMenu() called with:", contexts);
  
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
    console.log("[AI Context Manager] No contexts, showing message");
    const empty = document.createElement("div");
    
    // Check if it's because chrome.runtime isn't available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      empty.innerHTML = `
        <div style="padding: 8px; color: #ff6666;">
          Extension communication error.<br>
          Try refreshing the page or reloading the extension.
        </div>
        <div style="padding: 8px; color: #aaa; font-size: 11px;">
          If this persists, check the browser console for errors.
        </div>
      `;
    } else {
      empty.textContent = "No contexts yet. Click the extension icon to add some.";
      empty.style.padding = "8px";
      empty.style.color = "#aaa";
    }
    
    menu.appendChild(empty);
  } else {
    console.log("[AI Context Manager] Adding", contexts.length, "context items");
    contexts.forEach((context, index) => {
      const item = document.createElement("div");
      item.textContent = context.title;
      item.style.padding = "6px 8px";
      item.style.cursor = "pointer";
      item.style.borderRadius = "3px";
      item.title = context.body.length > 200 ? context.body.slice(0, 200) + "…" : context.body;

      item.addEventListener("click", () => {
        console.log("[AI Context Manager] Context clicked:", context.title);
        injectText(context.body);
        
        // Try to update usage tracking if chrome.runtime is available
        if (chrome?.runtime?.sendMessage) {
          try {
            chrome.runtime.sendMessage({ type: "TOUCH_CONTEXT", id: context.id });
          } catch (error) {
            console.warn("[AI Context Manager] Could not update context usage:", error);
          }
        }
        
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
  console.log("[AI Context Manager] injectText() called");
  
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
    
    // Trigger events
    active.dispatchEvent(new Event("input", { bubbles: true }));
    active.dispatchEvent(new Event("change", { bubbles: true }));
    
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
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
  // Wait a bit for the extension to fully load
  setTimeout(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureButton);
    } else {
      ensureButton();
    }
  }, 500);
  
  // Backup timer
  setTimeout(ensureButton, 2000);
}
