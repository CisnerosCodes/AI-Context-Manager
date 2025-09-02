/**
 * AI Context Manager - Content Script
 * Injects "Context ▼" dropdown into supported AI chat UIs and enables insertion.
 */
const SITE_CONFIGS = {
  'chat.openai.com': {
    name: 'ChatGPT',
    inputSelector: 'form textarea',
    buttonContainer: 'form',
    buttonPosition: 'beforeend',
    insertFunction: insertToTextarea,
    observeTarget: 'body',
    observeConfig: { childList: true, subtree: true }
  },
  'claude.ai': {
    name: 'Claude',
    inputSelector: '[contenteditable="true"]',
    buttonContainer: '.ProseMirror-menubar, form, body',
    buttonPosition: 'afterbegin',
    insertFunction: insertToContentEditable,
    observeTarget: 'body',
    observeConfig: { childList: true, subtree: true }
  },
  'gemini.google.com': {
    name: 'Gemini',
    inputSelector: '.text-input-field__textarea',
    buttonContainer: '.text-input-field__bottom-row',
    buttonPosition: 'afterbegin',
    insertFunction: insertToTextarea,
    observeTarget: 'body',
    observeConfig: { childList: true, subtree: true }
  },
  'perplexity.ai': {
    name: 'Perplexity',
    inputSelector: 'textarea, [contenteditable="true"]',
    buttonContainer: '.relative .flex.items-center, form',
    buttonPosition: 'afterbegin',
    insertFunction: function (el, text) {
      if (el.tagName === 'TEXTAREA') insertToTextarea(el, text);
      else insertToContentEditable(el, text);
    },
    observeTarget: 'body',
    observeConfig: { childList: true, subtree: true }
  }
};

let contexts = [];
let currentSiteConfig = null;
let observer;
let buttonInjected = false;
let mutationThrottle = null;

init();

function init() {
  loadContexts();
  detectSite();
  setupMessageListener();
}

function loadContexts() {
  chrome.storage.local.get('contexts', res => { contexts = res.contexts || []; });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.contexts) {
      contexts = changes.contexts.newValue || [];
    }
  });
}

function detectSite() {
  currentSiteConfig = SITE_CONFIGS[location.hostname];
  if (!currentSiteConfig) return;
  console.log('[AI Context Manager] Detected:', currentSiteConfig.name);
  setupObserver();
  tryInjectButton();
}

function setupObserver() {
  if (observer) observer.disconnect();
  const target = document.querySelector(currentSiteConfig.observeTarget);
  if (!target) return;
  observer = new MutationObserver(() => {
    if (mutationThrottle) return;
    mutationThrottle = setTimeout(() => {
      mutationThrottle = null;
      if (!document.querySelector('.acm-btn-root')) buttonInjected = false;
      if (!buttonInjected) tryInjectButton();
    }, 250);
  });
  observer.observe(target, currentSiteConfig.observeConfig);
}

function tryInjectButton() {
  const inputEl = document.querySelector(currentSiteConfig.inputSelector);
  if (!inputEl) return;
  const container = pickContainer(currentSiteConfig.buttonContainer);
  if (!container) return;
  if (container.querySelector('.acm-btn-root')) { buttonInjected = true; return; }
  ensureStyles();
  const btn = buildButton();
  container.insertAdjacentElement(currentSiteConfig.buttonPosition, btn);
  buttonInjected = true;
  console.log('[AI Context Manager] Injected context button.');
}

function pickContainer(selectorList) {
  const selectors = selectorList.split(',').map(s => s.trim());
  for (const sel of selectors) {
    const found = document.querySelector(sel);
    if (found) return found;
  }
  return null;
}

function buildButton() {
  const root = document.createElement('div');
  root.className = 'acm-btn-root';
  root.innerHTML = `
    <button class="acm-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">Context ▼</button>
    <div class="acm-dropdown" role="listbox" tabindex="-1">
      <div class="acm-search"><input type="text" placeholder="Search contexts..." aria-label="Search contexts"></div>
      <div class="acm-list"></div>
    </div>`;
  const trigger = root.querySelector('.acm-trigger');
  const searchInput = root.querySelector('.acm-search input');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const active = root.classList.toggle('acm-open');
    trigger.setAttribute('aria-expanded', active ? 'true' : 'false');
    if (active) { renderList(root); searchInput.focus(); }
  });
  document.addEventListener('click', () => {
    if (root.classList.contains('acm-open')) {
      root.classList.remove('acm-open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
  root.querySelector('.acm-dropdown').addEventListener('click', e => e.stopPropagation());

  let searchDebounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => renderList(root, searchInput.value), 120);
  });
  return root;
}

function renderList(root, term = '') {
  const listEl = root.querySelector('.acm-list');
  const filtered = term
    ? contexts.filter(c =>
        c.title.toLowerCase().includes(term.toLowerCase()) ||
        c.content.toLowerCase().includes(term.toLowerCase()))
    : contexts;
  const sorted = [...filtered].sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  if (sorted.length === 0) {
    listEl.innerHTML = `<div class="acm-empty">No contexts found.<br>Add some via the extension popup.</div>`;
    return;
  }
  listEl.innerHTML = sorted.map(c => `
    <div class="acm-item" data-id="${c.id}" role="option" title="${escapeHtml(c.content.slice(0, 200))}">
      <div class="acm-item-title">${escapeHtml(c.title)}</div>
      <div class="acm-item-preview">${escapeHtml(c.content.slice(0, 60))}${c.content.length > 60 ? '…' : ''}</div>
    </div>`).join('');
  listEl.querySelectorAll('.acm-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const ctx = contexts.find(c => c.id === id);
      const inputEl = document.querySelector(currentSiteConfig.inputSelector);
      if (ctx && inputEl) {
        currentSiteConfig.insertFunction(inputEl, ctx.content);
        ctx.lastUsed = Date.now();
        chrome.runtime.sendMessage({
          action: 'updateLastUsed',
          contextId: ctx.id,
          timestamp: ctx.lastUsed
        });
      }
      root.classList.remove('acm-open');
    });
  });
}

function ensureStyles() {
  if (document.getElementById('acm-style')) return;
  const style = document.createElement('style');
  style.id = 'acm-style';
  style.textContent = `
    .acm-btn-root { position:relative; display:inline-block; margin-right:8px; font-family:inherit; }
    .acm-trigger { padding:6px 10px; background:#f0f0f0; border:1px solid #ccc; border-radius:4px; cursor:pointer; font-size:14px; }
    .acm-trigger:hover { background:#e3e3e3; }
    .acm-btn-root.acm-open .acm-dropdown { display:block; }
    .acm-dropdown { display:none; position:absolute; bottom:100%; left:0; width:300px; margin-bottom:6px; background:#fff; border:1px solid #ccc; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,0.15); z-index:999999; max-height:380px; overflow:hidden; }
    .acm-search { padding:8px; border-bottom:1px solid #eee; }
    .acm-search input { width:100%; padding:6px 8px; border:1px solid #ddd; border-radius:4px; font-size:14px; }
    .acm-list { max-height:330px; overflow-y:auto; }
    .acm-item { padding:8px 10px; border-bottom:1px solid #f1f1f1; cursor:pointer; }
    .acm-item:last-child { border-bottom:none; }
    .acm-item:hover { background:#f7f7f7; }
    .acm-item-title { font-weight:600; font-size:13px; margin-bottom:2px; }
    .acm-item-preview { font-size:12px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .acm-empty { padding:16px; font-size:13px; text-align:center; color:#666; }
  `;
  document.head.appendChild(style);
}

function insertToTextarea(el, text) {
  el.focus();
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const value = el.value;
  el.value = value.slice(0, start) + text + value.slice(end);
  el.selectionStart = el.selectionEnd = start + text.length;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertToContentEditable(el, text) {
  el.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    const node = document.createTextNode(text);
    el.appendChild(node);
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  } else {
    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode(text);
    range.deleteContents();
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'injectContext') {
      const inputEl = document.querySelector(currentSiteConfig?.inputSelector || '');
      if (inputEl && message.context?.content) {
        currentSiteConfig.insertFunction(inputEl, message.context.content);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Input or context not found' });
      }
    }
    return true;
  });
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}