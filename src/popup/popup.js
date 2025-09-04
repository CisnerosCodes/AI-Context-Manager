import { getContexts, addContext, updateContext, deleteContext } from "../storage/contexts.js";
import { getCategories, addCategory, updateCategory, deleteCategory } from "../storage/categories.js";

const listEl = document.getElementById("list");
const addBtn = document.getElementById("addBtn");
const categoriesBtn = document.getElementById("categoriesBtn");

// Context editor elements
const editorDialog = document.getElementById("editorDialog");
const editorForm = document.getElementById("editorForm");
const titleInput = document.getElementById("ctxTitle");
const bodyInput = document.getElementById("ctxBody");

// Category management elements
const categoryDialog = document.getElementById("categoryDialog");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const categoryList = document.getElementById("categoryList");

// Category editor elements
const categoryEditorDialog = document.getElementById("categoryEditorDialog");
const categoryEditorForm = document.getElementById("categoryEditorForm");
const categoryNameInput = document.getElementById("categoryName");

let editingId = null;
let editingCategoryId = null;

// Context management (existing functionality)
addBtn.addEventListener("click", () => {
  editingId = null;
  titleInput.value = "";
  bodyInput.value = "";
  editorDialog.showModal();
});

editorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  if (!title || !body) return;
  
  try {
    if (editingId) {
      await updateContext(editingId, { title, body });
    } else {
      await addContext({ title, body });
    }
    editorDialog.close();
    render();
  } catch (error) {
    alert("Error saving context: " + error.message);
  }
});

editorDialog.addEventListener("close", () => {
  if (editorDialog.returnValue !== "default") {
    titleInput.value = "";
    bodyInput.value = "";
  }
});

// Category management (new functionality)
categoriesBtn.addEventListener("click", () => {
  categoryDialog.showModal();
  renderCategories();
});

addCategoryBtn.addEventListener("click", () => {
  editingCategoryId = null;
  categoryNameInput.value = "";
  categoryEditorDialog.showModal();
});

categoryEditorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = categoryNameInput.value.trim();
  if (!name) return;
  
  try {
    if (editingCategoryId) {
      await updateCategory(editingCategoryId, { name });
    } else {
      await addCategory({ name });
    }
    categoryEditorDialog.close();
    renderCategories();
  } catch (error) {
    alert("Error saving category: " + error.message);
  }
});

categoryEditorDialog.addEventListener("close", () => {
  if (categoryEditorDialog.returnValue !== "default") {
    categoryNameInput.value = "";
  }
});

async function render() {
  const contexts = await getContexts();
  listEl.innerHTML = "";
  
  if (contexts.length === 0) {
    listEl.innerHTML = `<div style="text-align:center; padding:20px; color:#666;">No contexts yet. Click "+ Add" to create one.</div>`;
    return;
  }
  
  contexts.forEach(ctx => {
    const item = document.createElement("div");
    item.className = "item";

    const titleBar = document.createElement("div");
    titleBar.className = "item-title";

    const titleSpan = document.createElement("span");
    titleSpan.textContent = ctx.title;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      editingId = ctx.id;
      titleInput.value = ctx.title;
      bodyInput.value = ctx.body;
      editorDialog.showModal();
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async () => {
      if (confirm(`Delete "${ctx.title}"?`)) {
        await deleteContext(ctx.id);
        render();
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    titleBar.appendChild(titleSpan);
    titleBar.appendChild(actions);

    const preview = document.createElement("div");
    preview.textContent = ctx.body.substring(0, 100) + (ctx.body.length > 100 ? "..." : "");
    preview.style.fontSize = "11px";
    preview.style.color = "#aaa";

    item.appendChild(titleBar);
    item.appendChild(preview);
    listEl.appendChild(item);
  });
}

async function renderCategories() {
  const categories = await getCategories();
  categoryList.innerHTML = "";
  
  if (categories.length === 0) {
    categoryList.innerHTML = `<div style="text-align:center; padding:20px; color:#666;">No categories yet. Click "+ New Category" to create one.</div>`;
    return;
  }
  
  categories.forEach(category => {
    const item = document.createElement("div");
    item.className = "category-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "category-name";
    nameSpan.textContent = category.name;

    const actions = document.createElement("div");
    actions.className = "category-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      editingCategoryId = category.id;
      categoryNameInput.value = category.name;
      categoryEditorDialog.showModal();
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async () => {
      if (confirm(`Delete category "${category.name}"?`)) {
        try {
          await deleteCategory(category.id);
          renderCategories();
        } catch (error) {
          alert("Error deleting category: " + error.message);
        }
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    item.appendChild(nameSpan);
    item.appendChild(actions);
    categoryList.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", render);
