import { getContexts, addContext, updateContext, deleteContext, touchContext } from "../storage/contexts.js";

const listEl = document.getElementById("list");
const addBtn = document.getElementById("addBtn");
const editorDialog = document.getElementById("editorDialog");
const editorForm = document.getElementById("editorForm");
const titleInput = document.getElementById("ctxTitle");
const bodyInput = document.getElementById("ctxBody");
const saveBtn = document.getElementById("saveBtn");

let editingId = null;

// Helper function to copy text to clipboard with fallback
async function copyToClipboard(text) {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // Fall through to fallback method
  }
  
  // Fallback using execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    return false;
  }
}

// Message handling for content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "REQUEST_CONTEXTS") {
    getContexts().then(sendResponse);
    return true;
  }
  if (msg.type === "TOUCH_CONTEXT") {
    touchContext(msg.id);
  }
});

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
    listEl.innerHTML = `<div style="text-align: center; padding: 20px; color: #666;">No contexts yet. Click "+ Add" to create one.</div>`;
    return;
  }

  contexts.forEach(ctx => {
    const item = document.createElement("div");
    item.className = "item";
    
    const title = document.createElement("div");
    title.className = "item-title";
    
    const titleText = document.createElement("span");
    titleText.textContent = ctx.title;
    
    const actions = document.createElement("div");
    actions.className = "item-actions";
    
    // Copy button
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      
      // Disable button and show feedback
      copyBtn.disabled = true;
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      
      try {
        await copyToClipboard(ctx.body);
      } catch (err) {
        // Even if copy fails, we show feedback
        console.warn("Copy failed:", err);
      }
      
      // Restore button after 1200ms
      setTimeout(() => {
        copyBtn.disabled = false;
        copyBtn.textContent = originalText;
      }, 1200);
    });
    
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      editingId = ctx.id;
      titleInput.value = ctx.title;
      bodyInput.value = ctx.body;
      editorDialog.showModal();
    });
    
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      if (confirm(`Delete "${ctx.title}"?`)) {
        await deleteContext(ctx.id);
        render();
      }
    });
    
    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    title.appendChild(titleText);
    title.appendChild(actions);
    
    const preview = document.createElement("div");
    preview.textContent = ctx.body.substring(0, 100) + (ctx.body.length > 100 ? "..." : "");
    preview.style.fontSize = "11px";
    preview.style.color = "#aaa";
    
    item.appendChild(title);
    item.appendChild(preview);
    listEl.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", render);