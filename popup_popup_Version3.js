/**
 * AI Context Manager - Popup Script
 * Handles CRUD, search/filter, import/export, and injection messaging.
 */
const els = {
  addNew: document.getElementById('addNewContext'),
  showSettings: document.getElementById('showSettings'),
  search: document.getElementById('searchInput'),
  filter: document.getElementById('categoryFilter'),
  list: document.getElementById('contextsList'),
  formModal: document.getElementById('contextForm'),
  formTitle: document.getElementById('formTitle'),
  contextId: document.getElementById('contextId'),
  contextTitle: document.getElementById('contextTitle'),
  contextCategory: document.getElementById('contextCategory'),
  contextContent: document.getElementById('contextContent'),
  cancelForm: document.getElementById('cancelForm'),
  saveContext: document.getElementById('saveContext'),
  settingsPanel: document.getElementById('settingsPanel'),
  closeSettings: document.getElementById('closeSettings'),
  exportBtn: document.getElementById('exportContexts'),
  importBtn: document.getElementById('importContexts'),
  importFile: document.getElementById('importFile'),
  overlay: document.getElementById('overlay')
};

let contexts = [];
let editMode = false;
let searchDebounce;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadContexts();
  renderList();
  setupListeners();
  subscribeToStorageChanges();
}

async function loadContexts() {
  const res = await chrome.storage.local.get('contexts');
  contexts = (res.contexts || []).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
}

function subscribeToStorageChanges() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.contexts) {
      contexts = (changes.contexts.newValue || []).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
      renderList();
    }
  });
}

async function saveContexts() { await chrome.storage.local.set({ contexts }); }

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

function setupListeners() {
  els.addNew.addEventListener('click', () => showAddForm());
  els.showSettings.addEventListener('click', () => toggleSettings(true));
  els.closeSettings.addEventListener('click', () => toggleSettings(false));
  els.cancelForm.addEventListener('click', () => toggleForm(false));
  els.saveContext.addEventListener('click', onSaveContext);
  els.overlay.addEventListener('click', () => { toggleForm(false); toggleSettings(false); });
  els.search.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(renderList, 140);
  });
  els.filter.addEventListener('change', renderList);
  els.exportBtn.addEventListener('click', onExport);
  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', onImport);
}

function showAddForm() {
  editMode = false;
  els.formTitle.textContent = 'Add New Context';
  els.contextId.value = '';
  els.contextTitle.value = '';
  els.contextContent.value = '';
  els.contextCategory.value = 'personal';
  toggleForm(true);
}

function showEditForm(id) {
  const ctx = contexts.find(c => c.id === id);
  if (!ctx) return;
  editMode = true;
  els.formTitle.textContent = 'Edit Context';
  els.contextId.value = ctx.id;
  els.contextTitle.value = ctx.title;
  els.contextContent.value = ctx.content;
  els.contextCategory.value = ctx.category;
  toggleForm(true);
}

async function onSaveContext() {
  const title = els.contextTitle.value.trim();
  const content = els.contextContent.value.trim();
  const category = els.contextCategory.value;
  if (!title || !content) { alert('Title and content are required.'); return; }
  if (editMode) {
    const id = els.contextId.value;
    const idx = contexts.findIndex(c => c.id === id);
    if (idx !== -1) contexts[idx] = { ...contexts[idx], title, content, category };
  } else {
    contexts.unshift({ id: generateId(), title, content, category, created: Date.now(), lastUsed: null });
  }
  await saveContexts();
  toggleForm(false);
  renderList();
}

async function onDeleteContext(id) {
  if (!confirm('Delete this context?')) return;
  const idx = contexts.findIndex(c => c.id === id);
  if (idx !== -1) {
    contexts.splice(idx, 1);
    await saveContexts();
    renderList();
  }
}

async function onInjectContext(id) {
  const ctx = contexts.find(c => c.id === id);
  if (!ctx) return;
  ctx.lastUsed = Date.now();
  await saveContexts();
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'injectContext', context: ctx });
  });
  renderList();
}

function filterContexts() {
  const term = els.search.value.toLowerCase();
  const cat = els.filter.value;
  return contexts.filter(c => {
    const matchesTerm = c.title.toLowerCase().includes(term) || c.content.toLowerCase().includes(term);
    const matchesCat = cat === 'all' || c.category === cat;
    return matchesTerm && matchesCat;
  });
}

function renderList() {
  const list = filterContexts();
  els.list.innerHTML = '';
  if (list.length === 0) {
    els.list.innerHTML = `
      <div class="empty-state">
        <p>No contexts found.</p>
        <button id="emptyAdd" class="btn primary" type="button">Add Your First Context</button>
      </div>`;
    document.getElementById('emptyAdd').addEventListener('click', () => showAddForm());
    return;
  }
  for (const c of list) {
    const div = document.createElement('div');
    div.className = 'context-item';
    div.innerHTML = `
      <div class="context-header">
        <div class="context-title">${escapeHtml(c.title)}</div>
        <div class="context-category ${c.category}">${escapeHtml(c.category)}</div>
      </div>
      <div class="context-content" title="${escapeHtml(c.content)}">${escapeHtml(c.content.slice(0, 100))}${c.content.length > 100 ? '…' : ''}</div>
      <div class="context-actions">
        <button class="btn secondary inject-btn" data-id="${c.id}" type="button">Inject</button>
        <button class="btn secondary edit-btn" data-id="${c.id}" type="button">Edit</button>
        <button class="btn delete delete-btn" data-id="${c.id}" type="button">Delete</button>
      </div>`;
    els.list.appendChild(div);
  }
  els.list.querySelectorAll('.inject-btn').forEach(b => b.addEventListener('click', e => onInjectContext(e.target.dataset.id)));
  els.list.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', e => showEditForm(e.target.dataset.id)));
  els.list.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', e => onDeleteContext(e.target.dataset.id)));
}

function toggleForm(show) {
  els.formModal.classList.toggle('hidden', !show);
  els.overlay.classList.toggle('hidden', !show);
  if (show) els.contextTitle.focus();
}

function toggleSettings(show) {
  els.settingsPanel.classList.toggle('hidden', !show);
  els.overlay.classList.toggle('hidden', !show);
}

function onExport() {
  if (contexts.length === 0) { alert('No contexts to export.'); return; }
  const exportObj = { version: 1, exportedAt: new Date().toISOString(), contexts };
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const name = `ai-contexts-${new Date().toISOString().slice(0,10)}.json`;
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function onImport(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (!parsed.contexts || !Array.isArray(parsed.contexts)) throw new Error('Invalid file');
      const valid = parsed.contexts.filter(c => c.id && c.title && c.content);
      const existingIds = new Set(contexts.map(c => c.id));
      let added = 0;
      for (const ctx of valid) {
        if (!existingIds.has(ctx.id)) {
          contexts.push(ctx);
          added++;
        }
      }
      await saveContexts();
      renderList();
      alert(`Imported ${added} new context(s).`);
    } catch (err) {
      console.error('Import error:', err);
      alert('Import failed. Ensure this is a valid export file.');
    } finally {
      els.importFile.value = '';
    }
  };
  reader.readAsText(file);
}

function escapeHtml(str='') {
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}