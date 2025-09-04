// Content script – mounts inline context button/menu on supported AI sites.

const SUPPORTED_SITES = [
  "claude.ai",
  "chat.openai.com",
  "chatgpt.com",
  "gemini.google.com",
  "perplexity.ai",
  "www.perplexity.ai"
];

const BUTTON_ID = "ai-context-manager-inline-button";
const MENU_ID = "ai-context-manager-inline-menu";

const LOG_PREFIX = "[AI Context Manager]";
const RUNTIME_RELOAD_HINT = "The extension was reloaded or the background service worker was unloaded.";
const STORAGE_KEY = "aiContextManagerContexts"; // must match STORAGE_KEY in common/constants.js (duplicated intentionally to allow storage fallback)

console.log(`${LOG_PREFIX} Content script loaded on ${location.host}`);

function siteSupported() {
  const host = window.location.host;
  return SUPPORTED_SITES.some(h => host.includes(h));
}

ensureButton();
maybeAttachLifecycleListeners();

/**
 * Insert the floating button if not present.
 */
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

/**
 * Toggle the menu visibility.
 */
function toggleMenu() {
  console.log(`${LOG_PREFIX} toggleMenu() called`);
  const existing = document.getElementById(MENU_ID);
  if (existing) {
    existing.remove();
    return;
  }
  // Clean any stale duplicates
  document.querySelectorAll(`#${MENU_ID}`).forEach(n => n.remove());
  // Render a "loading" container first
  renderMenu({ state: "loading" });
  // Fetch contexts
  requestContextsAndRender();
}

/**
 * Robust retrieval with:
 *  - runtime presence checks
 *  - graceful fallback to storage read
 *  - distinct error vs empty states
 */
function requestContextsAndRender({ attempt = 1 } = {}) {
  console.log(`${LOG_PREFIX} Requesting contexts (attempt ${attempt})...`);

  if (!chrome?.runtime?.id) {
    console.warn(`${LOG_PREFIX} No chrome.runtime.id. Likely extension reload.`);
    renderMenu({
      state: "error",
      error: `${RUNTIME_RELOAD_HINT} Refresh this page to restore functionality.`
    });
    return;
  }

  let responded = false;

  try {
    chrome.runtime.sendMessage({ type: "REQUEST_CONTEXTS" }, (payload) => {
      responded = true;
      const err = chrome.runtime.lastError;
      if (err) {
        console.error(`${LOG_PREFIX} Message error: ${err.message}`);
        if (/context invalidated/i.test(err.message)) {
          renderMenu({
            state: "error",
            error: `${RUNTIME_RELOAD_HINT} Refresh the page.`
          });
          return;
        }
        // Retry once for transient startup issues
        if (attempt === 1) {
          setTimeout(() => requestContextsAndRender({ attempt: attempt + 1 }), 150);
          return;
        }
        // As final fallback, try reading storage directly
        fallbackStorageLoad()
          .then(list => renderMenu({ state: "data", contexts: list, note: "Loaded via storage fallback." }))
          .catch(storageErr =>
            renderMenu({ state: "error", error: `Failed to load contexts: ${storageErr.message}` })
          );
        return;
      }

      // Background may return structured error
      if (payload && payload.error) {
        console.warn(`${LOG_PREFIX} Background responded with error: ${payload.message || "(no message)"}`);
        renderMenu({
          state: "error",
            error: payload.message || "Unknown background error."
        });
        return;
      }

      if (!Array.isArray(payload)) {
        console.warn(`${LOG_PREFIX} Unexpected payload type`, payload);
        renderMenu({
          state: "error",
          error: "Invalid data format from background."
        });
        return;
      }

      renderMenu({ state: "data", contexts: payload });
    });
  } catch (e) {
    console.error(`${LOG_PREFIX} sendMessage threw:`, e);
    if (attempt === 1) {
      setTimeout(() => requestContextsAndRender({ attempt: attempt + 1 }), 100);
      return;
    }
    fallbackStorageLoad()
      .then(list => renderMenu({ state: "data", contexts: list, note: "Loaded via storage fallback." }))
      .catch(storageErr =>
        renderMenu({ state: "error", error: `Failed to load contexts: ${storageErr.message}` })
      );
  }

  // Safety timeout if callback never fires (rare)
  setTimeout(() => {
    if (!responded) {
      console.warn(`${LOG_PREFIX} No response from background within timeout; attempting fallback.`);
      fallbackStorageLoad()
        .then(list => renderMenu({ state: "data", contexts: list, note: "Loaded via storage timeout fallback." }))
        .catch(storageErr =>
          renderMenu({ state: "error", error: `Timeout and storage fallback failed: ${storageErr.message}` })
        );
    }
  }, 1500);
}

/**
 * Direct storage read fallback (read-only).
 */
function fallbackStorageLoad() {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.local) {
      return reject(new Error("chrome.storage unavailable."));
    }
    chrome.storage.local.get([STORAGE_KEY], (data) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        return reject(err);
      }
      const raw = data?.[STORAGE_KEY];
      if (!Array.isArray(raw)) return resolve([]);
      // Sort descending updatedAt like getContexts()
      resolve([...raw].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
    });
  });
}

/**
 * Render menu states.
 * params:
 *   state: "loading" | "data" | "error"
 *   contexts?: array
 *   error?: string
 *   note?: string
 */
function renderMenu(params) {
  const { state, contexts = [], error, note } = params || {};
  // Remove old one if exists
  document.getElementById(MENU_ID)?.remove();

  const menu = document.createElement("div");
  menu.id = MENU_ID;
  Object.assign(menu.style, {
    position: "fixed",
    bottom: "48px",
    right: "12px",
    minWidth: "280px",
    maxHeight: "320px",
    overflowY: "auto",
    background: "#1f1f1f",
    color: "#eee",
    fontSize: "12px",
    fontFamily: "system-ui, sans-serif",
    border: "1px solid #555",
    borderRadius: "6px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.45)",
    padding: "6px",
    zIndex: "2147483647"
  });

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.marginBottom = "6px";

  const title = document.createElement("strong");
  title.textContent = "Contexts";
  header.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  Object.assign(closeBtn.style, {
    background: "transparent",
    border: "none",
    color: "#ccc",
    cursor: "pointer",
    fontSize: "14px",
    lineHeight: "1"
  });
  closeBtn.addEventListener("click", () => menu.remove());
  header.appendChild(closeBtn);
  menu.appendChild(header);

  if (state === "loading") {
    const loading = document.createElement("div");
    loading.textContent = "Loading contexts...";
    loading.style.padding = "6px 4px";
    menu.appendChild(loading);
    document.body.appendChild(menu);
    return;
  }

  if (state === "error") {
    const errBox = document.createElement("div");
    errBox.style.padding = "6px 4px";
    errBox.style.color = "#ff9d9d";
    errBox.innerHTML = `<strong>Error:</strong> ${escapeHtml(error || "Unknown error")}`;
    menu.appendChild(errBox);

    const actions = document.createElement("div");
    actions.style.marginTop = "4px";
    actions.style.display = "flex";
    actions.style.gap = "4px";

    const retry = document.createElement("button");
    retry.textContent = "Retry";
    baseSmallButton(retry);
    retry.addEventListener("click", () => {
      menu.remove();
      renderMenu({ state: "loading" });
      requestContextsAndRender();
    });

    const refresh = document.createElement("button");
    refresh.textContent = "Refresh Page";
    baseSmallButton(refresh);
    refresh.addEventListener("click", () => location.reload());

    actions.appendChild(retry);
    actions.appendChild(refresh);
    menu.appendChild(actions);

    document.body.appendChild(menu);
    return;
  }

  // state === "data"
  if (!contexts.length) {
    const empty = document.createElement("div");
    empty.style.padding = "6px 4px";
    empty.innerHTML = `
      <div style="color:#ccc; line-height:1.3;">
        No contexts stored yet.<br>
        Open the extension popup to add your first snippet.
      </div>`;
    menu.appendChild(empty);
  } else {
    const listWrap = document.createElement("div");
    for (const ctx of contexts) {
      const item = document.createElement("div");
      Object.assign(item.style, {
        border: "1px solid #444",
        borderRadius: "4px",
        padding: "4px 6px",
        marginBottom: "4px",
        background: "#2b2b2b",
        cursor: "pointer"
      });

      const titleEl = document.createElement("div");
      titleEl.textContent = ctx.title || "Untitled";
      titleEl.style.fontWeight = "600";
      titleEl.style.marginBottom = "2px";
      titleEl.style.fontSize = "12px";

      const bodyEl = document.createElement("div");
      bodyEl.textContent = (ctx.body || "").slice(0, 140) + (ctx.body && ctx.body.length > 140 ? "…" : "");
      bodyEl.style.fontSize = "11px";
      bodyEl.style.whiteSpace = "pre-wrap";
      bodyEl.style.lineHeight = "1.25";

      item.appendChild(titleEl);
      item.appendChild(bodyEl);

      item.addEventListener("click", () => {
        copyToClipboard(ctx.body || "");
        item.style.outline = "1px solid #6fa8ff";
        setTimeout(() => (item.style.outline = ""), 600);
        // Optional: could message background to touchContext; safe-guard runtime
        if (chrome?.runtime?.id) {
          chrome.runtime.sendMessage({ type: "TOUCH_CONTEXT", id: ctx.id }, () => {});
        }
      });

      listWrap.appendChild(item);
    }
    menu.appendChild(listWrap);
  }

  if (note) {
    const noteEl = document.createElement("div");
    noteEl.style.marginTop = "6px";
    noteEl.style.fontSize = "10px";
    noteEl.style.opacity = "0.7";
    noteEl.textContent = note;
    menu.appendChild(noteEl);
  }

  document.body.appendChild(menu);
}

/**
 * Basic small button styling helper.
 */
function baseSmallButton(btn) {
  Object.assign(btn.style, {
    background: "#444",
    color: "#eee",
    border: "1px solid #555",
    padding: "3px 6px",
    fontSize: "11px",
    borderRadius: "4px",
    cursor: "pointer"
  });
  btn.addEventListener("mouseenter", () => (btn.style.background = "#555"));
  btn.addEventListener("mouseleave", () => (btn.style.background = "#444"));
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    ta.remove();
  });
}

/**
 * Escape HTML for error messages.
 */
function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, s => {
    switch (s) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return s;
    }
  });
}

/**
 * Optional: If the page does a soft navigation (SPA), re-inject button.
 */
function maybeAttachLifecycleListeners() {
  let lastHref = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      ensureButton();
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });
}
