import { SUPPORTED_SITES } from "../common/constants.js";

const BUTTON_ID = "ai-context-manager-inline-button";
const MENU_ID = "ai-context-manager-inline-menu";

function ensureButton() {
  if (document.getElementById(BUTTON_ID)) return;
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.textContent = "Context ▼";
  btn.style.position = "fixed";
  btn.style.bottom = "12px";
  btn.style.right = "12px";
  btn.style.zIndex = 999999;
  btn.style.padding = "6px 10px";
  btn.style.fontSize = "12px";
  btn.style.background = "#444";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "4px";
  btn.style.cursor = "pointer";
  btn.addEventListener("click", toggleMenu);
  document.body.appendChild(btn);
}

function toggleMenu() {
  const existing = document.getElementById(MENU_ID);
  if (existing) { existing.remove(); return; }
  chrome.runtime.sendMessage({ type: "REQUEST_CONTEXTS" }, ctxs => {
    renderMenu(ctxs || []);
  });
}

function renderMenu(contexts) {
  const menu = document.createElement("div");
  menu.id = MENU_ID;
  menu.style.position = "fixed";
  menu.style.bottom = "48px";
  menu.style.right = "12px";
  menu.style.minWidth = "240px";
  menu.style.maxHeight = "300px";
  menu.style.overflowY = "auto";
  menu.style.background = "#222";
  menu.style.color = "#eee";
  menu.style.fontSize = "12px";
  menu.style.border = "1px solid #555";
  menu.style.borderRadius = "4px";
  menu.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
  menu.style.padding = "4px";

  if (contexts.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No contexts.";
    empty.style.padding = "8px";
    menu.appendChild(empty);
  } else {
    contexts.forEach(c => {
      const item = document.createElement("div");
      item.textContent = c.title;
      item.style.padding = "6px 8px";
      item.style.cursor = "pointer";
      item.style.borderRadius = "3px";
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
      document.execCommand("insertText", false, text);
    }
    return;
  }
  navigator.clipboard.writeText(text).catch(() => {});
  alert("Context copied to clipboard (no input focused).");
}

function siteSupported() {
  const host = window.location.host;
  return SUPPORTED_SITES.some(s => host.includes(s.hostIncludes));
}

if (siteSupported()) {
  ensureButton();
}