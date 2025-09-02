import { getContexts, addContext, updateContext, deleteContext } from "../storage/contexts.js";

const listEl = document.getElementById("list");
const addBtn = document.getElementById("addBtn");
const editorDialog = document.getElementById("editorDialog");
const editorForm = document.getElementById("editorForm");
const titleInput = document.getElementById("ctxTitle");
const bodyInput = document.getElementById("ctxBody");

let editingId = null;

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
  if (editingId) {
    await updateContext(editingId, { title, body });
  } else {
    await addContext({ title, body });
  }
  editorDialog.close();
  render();
});

editorDialog.addEventListener("close", () => {
  if (editorDialog.returnValue !== "default") {
    titleInput.value = "";
    bodyInput.value = "";
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

document.addEventListener("DOMContentLoaded", render);
