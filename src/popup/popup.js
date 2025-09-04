import { getContexts, addContext, updateContext, deleteContext, stripCategoryFromContexts } from "../storage/contexts.js";
import { getCategories, addCategory, updateCategory, deleteCategory } from "../storage/categories.js";

let contexts = [];
let categories = [];

const els = {
  list: document.getElementById("list"),
  addBtn: document.getElementById("addBtn"),
  categoriesBtn: document.getElementById("categoriesBtn"),
  editorDialog: document.getElementById("editorDialog"),
  editorForm: document.getElementById("editorForm"),
  ctxTitle: document.getElementById("ctxTitle"),
  ctxBody: document.getElementById("ctxBody"),
  categoryDialog: document.getElementById("categoryDialog"),
  categoryList: document.getElementById("categoryList"),
  addCategoryBtn: document.getElementById("addCategoryBtn"),
  categoryEditorDialog: document.getElementById("categoryEditorDialog"),
  categoryEditorForm: document.getElementById("categoryEditorForm"),
  categoryName: document.getElementById("categoryName")
};

let editingContextId = null;
let editingCategoryId = null;

(async function init() {
  await refreshData();
  renderContexts();
  wireEvents();
})().catch(console.error);

async function refreshData() {
  contexts = await getContexts();
  categories = await getCategories();
}

function renderContexts() {
  els.list.innerHTML = "";
  if (!contexts.length) {
    const empty = document.createElement("div");
    empty.textContent = "No contexts yet.";
    empty.style.opacity = "0.7";
    empty.style.fontSize = "13px";
    els.list.appendChild(empty);
    return;
  }

  contexts
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach(ctx => {
      const wrapper = document.createElement("div");
      wrapper.className = "item";

      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = ctx.title;

      const catRow = document.createElement("div");
      catRow.style.display = "flex";
      catRow.style.alignItems = "center";
      catRow.style.gap = "6px";

      const label = document.createElement("span");
      label.style.fontSize = "11px";
      label.style.opacity = "0.8";
      label.textContent = "Category:";

      const select = document.createElement("select");
      Object.assign(select.style, {
        flex: "1",
        background: "#222",
        color: "#eee",
        border: "1px solid #444",
        borderRadius: "4px",
        fontSize: "11px"
      });
      select.innerHTML = `<option value="">(None)</option>` +
        categories.map(c => `<option value="${c.id}" ${ctx.categoryId === c.id ? "selected" : ""}>${c.name}</option>`).join("");

      select.addEventListener("change", async () => {
        ctx.categoryId = select.value || null;
        await updateContext(ctx.id, { categoryId: ctx.categoryId });
        await refreshData();
        renderContexts();
      });

      catRow.append(label, select);

      const body = document.createElement("div");
      body.style.fontSize = "12px";
      body.style.whiteSpace = "pre-wrap";
      body.textContent = ctx.body.slice(0, 240) + (ctx.body.length > 240 ? "…" : "");

      const meta = document.createElement("div");
      meta.style.fontSize = "10px";
      meta.style.opacity = "0.6";
      meta.textContent = `Uses: ${ctx.uses || 0}`;

      const actions = document.createElement("div");
      actions.className = "item-actions";
      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => openEditor(ctx));

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        if (!confirm(`Delete "${ctx.title}"?`)) return;
        await deleteContext(ctx.id);
        await refreshData();
        renderContexts();
      });

      actions.append(editBtn, delBtn);

      wrapper.append(title, catRow, body, meta, actions);
      els.list.appendChild(wrapper);
    });
}

function openEditor(ctx) {
  editingContextId = ctx ? ctx.id : null;
  els.ctxTitle.value = ctx ? ctx.title : "";
  els.ctxBody.value = ctx ? ctx.body : "";
  els.editorDialog.showModal();
}

function wireEvents() {
  els.addBtn.addEventListener("click", () => openEditor(null));

  els.categoriesBtn.addEventListener("click", async () => {
    await refreshData();
    renderCategories();
    els.categoryDialog.showModal();
  });

  // Generic cancel/close for dialogs
  document.querySelectorAll('dialog button[value="cancel"], dialog button[value="close"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const dlg = btn.closest("dialog");
      if (dlg?.open) dlg.close("cancel");
    });
  });

  els.editorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = els.ctxTitle.value.trim();
    const body = els.ctxBody.value.trim();
    if (!title || !body) return;

    if (editingContextId) {
      await updateContext(editingContextId, { title, body });
    } else {
      await addContext({ title, body });
    }
    editingContextId = null;
    await refreshData();
    renderContexts();
    els.editorDialog.close("save");
  });

  els.addCategoryBtn.addEventListener("click", () => {
    editingCategoryId = null;
    els.categoryName.value = "";
    els.categoryEditorDialog.showModal();
  });

  els.categoryEditorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = els.categoryName.value.trim();
    if (!name) return;

    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, { name });
      } else {
        await addCategory({ name });
      }
    } catch (err) {
      alert(err.message);
      return;
    }

    editingCategoryId = null;
    await refreshData();
    renderCategories();
    renderContexts();
    els.categoryEditorDialog.close("save");
  });
}

function renderCategories() {
  els.categoryList.innerHTML = "";
  if (!categories.length) {
    const empty = document.createElement("div");
    empty.textContent = "No categories yet.";
    empty.style.opacity = "0.7";
    empty.style.fontSize = "13px";
    els.categoryList.appendChild(empty);
    return;
  }

  categories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(cat => {
      const row = document.createElement("div");
      row.className = "category-item";

      const name = document.createElement("div");
      name.className = "category-name";
      name.textContent = cat.name;

      const actions = document.createElement("div");
      actions.className = "category-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        editingCategoryId = cat.id;
        els.categoryName.value = cat.name;
        els.categoryEditorDialog.showModal();
      });

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        if (!confirm(`Delete category "${cat.name}"? Contexts will lose this association.`)) return;
        await deleteCategory(cat.id);
        await stripCategoryFromContexts(cat.id);
        await refreshData();
        renderCategories();
        renderContexts();
      });

      actions.append(editBtn, delBtn);
      row.append(name, actions);
      els.categoryList.appendChild(row);
    });
}
