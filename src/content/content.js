import { SUPPORTED_SITES } from "../common/constants.js";

const BUTTON_ID = "ai-context-manager-floating-btn";
const MODAL_ID = "ai-context-manager-modal";
const OVERLAY_ID = "ai-context-manager-overlay";

// Position storage key per host
const getPositionKey = () => `position:${window.location.host}`;

// Default position
const DEFAULT_POSITION = { bottom: 16, right: 16 };

let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let currentButton = null;
let currentModal = null;

function createFloatingButton() {
  if (document.getElementById(BUTTON_ID)) return;
  
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.textContent = "CTX";
  btn.setAttribute("aria-label", "Open AI Context Manager");
  btn.setAttribute("title", "AI Context Manager");
  
  // Load saved position for this host
  chrome.storage.local.get([getPositionKey()], (data) => {
    const position = data[getPositionKey()] || DEFAULT_POSITION;
    applyButtonStyles(btn, position);
  });
  
  // Event listeners
  btn.addEventListener("click", handleButtonClick);
  btn.addEventListener("mousedown", handleMouseDown);
  btn.addEventListener("keydown", handleKeyDown);
  
  document.body.appendChild(btn);
  currentButton = btn;
}

function applyButtonStyles(btn, position) {
  btn.style.position = "fixed";
  btn.style.zIndex = "999999";
  btn.style.width = "48px";
  btn.style.height = "48px";
  btn.style.borderRadius = "50%";
  btn.style.border = "none";
  btn.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  btn.style.color = "#fff";
  btn.style.fontSize = "12px";
  btn.style.fontWeight = "600";
  btn.style.cursor = "pointer";
  btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  btn.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
  btn.style.userSelect = "none";
  btn.style.touchAction = "none";
  
  // Set position
  if (position.bottom !== undefined) {
    btn.style.bottom = position.bottom + "px";
    btn.style.top = "auto";
  } else if (position.top !== undefined) {
    btn.style.top = position.top + "px";
    btn.style.bottom = "auto";
  }
  
  if (position.right !== undefined) {
    btn.style.right = position.right + "px";
    btn.style.left = "auto";
  } else if (position.left !== undefined) {
    btn.style.left = position.left + "px";
    btn.style.right = "auto";
  }
  
  // Hover effects
  btn.onmouseenter = () => {
    if (!isDragging) {
      btn.style.transform = "scale(1.05)";
      btn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)";
    }
  };
  
  btn.onmouseleave = () => {
    if (!isDragging) {
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    }
  };
}

function handleButtonClick(e) {
  e.preventDefault();
  e.stopPropagation();
  if (!isDragging) {
    toggleModal();
  }
}

function handleKeyDown(e) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggleModal();
  }
}

function handleMouseDown(e) {
  e.preventDefault();
  isDragging = true;
  const btn = currentButton;
  const rect = btn.getBoundingClientRect();
  
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  
  btn.style.cursor = "grabbing";
  btn.style.transform = "scale(1.1)";
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - 48;
    const maxY = window.innerHeight - 48;
    const constrainedX = Math.max(0, Math.min(maxX, x));
    const constrainedY = Math.max(0, Math.min(maxY, y));
    
    btn.style.left = constrainedX + "px";
    btn.style.top = constrainedY + "px";
    btn.style.right = "auto";
    btn.style.bottom = "auto";
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      btn.style.cursor = "pointer";
      btn.style.transform = "scale(1)";
      
      // Save new position
      const rect = btn.getBoundingClientRect();
      const position = {
        left: rect.left,
        top: rect.top
      };
      
      chrome.storage.local.set({ [getPositionKey()]: position });
      
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
  };
  
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

function toggleModal() {
  const existing = document.getElementById(MODAL_ID);
  if (existing) {
    closeModal();
    return;
  }
  
  // Request contexts from background
  chrome.runtime.sendMessage({ type: "GET_CONTEXTS" }, (contexts) => {
    createModal(contexts || []);
  });
}

function createModal(contexts) {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0, 0, 0, 0.5)";
  overlay.style.zIndex = "1000000";
  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 0.2s ease";
  
  overlay.addEventListener("click", closeModal);
  
  // Create modal panel
  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "modal-title");
  
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.right = "0";
  modal.style.width = "380px";
  modal.style.height = "100%";
  modal.style.background = "#1a1a1a";
  modal.style.color = "#ffffff";
  modal.style.boxShadow = "-4px 0 16px rgba(0,0,0,0.3)";
  modal.style.zIndex = "1000001";
  modal.style.transform = "translateX(100%)";
  modal.style.transition = "transform 0.3s ease";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.fontFamily = "system-ui, sans-serif";
  
  // Prevent click propagation to overlay
  modal.addEventListener("click", (e) => e.stopPropagation());
  
  // Create header
  const header = document.createElement("div");
  header.style.padding = "20px";
  header.style.borderBottom = "1px solid #333";
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  
  const title = document.createElement("h2");
  title.id = "modal-title";
  title.textContent = "AI Contexts";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.style.fontWeight = "600";
  
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", "Close modal");
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.color = "#ffffff";
  closeBtn.style.fontSize = "18px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.padding = "8px";
  closeBtn.style.borderRadius = "4px";
  closeBtn.style.transition = "background-color 0.2s ease";
  
  closeBtn.onmouseenter = () => closeBtn.style.background = "#333";
  closeBtn.onmouseleave = () => closeBtn.style.background = "none";
  closeBtn.addEventListener("click", closeModal);
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Create content area
  const content = document.createElement("div");
  content.style.flex = "1";
  content.style.padding = "20px";
  content.style.overflowY = "auto";
  
  if (contexts.length === 0) {
    const empty = document.createElement("div");
    empty.style.textAlign = "center";
    empty.style.color = "#888";
    empty.style.padding = "40px 20px";
    empty.style.fontSize = "14px";
    empty.textContent = "No contexts available. Create some using the extension popup.";
    content.appendChild(empty);
  } else {
    contexts.forEach((context, index) => {
      const item = createContextItem(context, index === 0);
      content.appendChild(item);
    });
  }
  
  modal.appendChild(header);
  modal.appendChild(content);
  
  // Add to document
  document.body.appendChild(overlay);
  document.body.appendChild(modal);
  
  currentModal = modal;
  
  // Animate in
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    modal.style.transform = "translateX(0)";
  });
  
  // Focus management
  const firstFocusable = modal.querySelector("button");
  if (firstFocusable) {
    firstFocusable.focus();
  }
  
  // Keyboard event listener
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      closeModal();
    } else if (e.key === "Tab") {
      trapFocus(e, modal);
    }
  };
  
  document.addEventListener("keydown", handleKeyDown);
  modal._keydownHandler = handleKeyDown;
}

function createContextItem(context, isFirst) {
  const item = document.createElement("div");
  item.style.marginBottom = "16px";
  item.style.padding = "16px";
  item.style.background = "#2a2a2a";
  item.style.borderRadius = "8px";
  item.style.border = "1px solid #444";
  item.style.transition = "border-color 0.2s ease, background-color 0.2s ease";
  
  item.onmouseenter = () => {
    item.style.background = "#333";
    item.style.borderColor = "#555";
  };
  item.onmouseleave = () => {
    item.style.background = "#2a2a2a";
    item.style.borderColor = "#444";
  };
  
  // Title
  const titleEl = document.createElement("div");
  titleEl.textContent = context.title;
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "14px";
  titleEl.style.marginBottom = "8px";
  titleEl.style.color = "#ffffff";
  
  // Truncated body preview
  const bodyEl = document.createElement("div");
  const truncatedBody = context.body.length > 100 
    ? context.body.substring(0, 100) + "..." 
    : context.body;
  bodyEl.textContent = truncatedBody;
  bodyEl.style.fontSize = "12px";
  bodyEl.style.color = "#aaa";
  bodyEl.style.lineHeight = "1.4";
  bodyEl.style.marginBottom = "12px";
  
  // Action button
  const injectBtn = document.createElement("button");
  injectBtn.textContent = "Inject";
  injectBtn.style.background = "#4f46e5";
  injectBtn.style.color = "#ffffff";
  injectBtn.style.border = "none";
  injectBtn.style.padding = "8px 16px";
  injectBtn.style.borderRadius = "6px";
  injectBtn.style.fontSize = "12px";
  injectBtn.style.fontWeight = "600";
  injectBtn.style.cursor = "pointer";
  injectBtn.style.transition = "background-color 0.2s ease";
  
  injectBtn.onmouseenter = () => injectBtn.style.background = "#4338ca";
  injectBtn.onmouseleave = () => injectBtn.style.background = "#4f46e5";
  
  injectBtn.addEventListener("click", () => {
    injectContext(context);
    closeModal();
  });
  
  item.appendChild(titleEl);
  item.appendChild(bodyEl);
  item.appendChild(injectBtn);
  
  return item;
}

function trapFocus(e, modal) {
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  if (e.shiftKey) {
    if (document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    }
  } else {
    if (document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }
}

function closeModal() {
  const overlay = document.getElementById(OVERLAY_ID);
  const modal = document.getElementById(MODAL_ID);
  
  if (modal && overlay) {
    // Remove keyboard listener
    if (modal._keydownHandler) {
      document.removeEventListener("keydown", modal._keydownHandler);
    }
    
    // Animate out
    overlay.style.opacity = "0";
    modal.style.transform = "translateX(100%)";
    
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      currentModal = null;
      
      // Return focus to button
      if (currentButton) {
        currentButton.focus();
      }
    }, 300);
  }
}

function injectContext(context) {
  // Touch the context to update usage
  chrome.runtime.sendMessage({ type: "TOUCH_CONTEXT", id: context.id });
  
  // Try to inject into active element
  const active = document.activeElement;
  if (active && (active.tagName === "TEXTAREA" || active.isContentEditable || active.tagName === "INPUT")) {
    if (active.tagName === "TEXTAREA" || active.tagName === "INPUT") {
      const start = active.selectionStart || 0;
      const end = active.selectionEnd || 0;
      const before = active.value.slice(0, start);
      const after = active.value.slice(end);
      active.value = before + context.body + after;
      active.selectionStart = active.selectionEnd = start + context.body.length;
      
      // Trigger input event
      const inputEvent = new Event("input", { bubbles: true });
      active.dispatchEvent(inputEvent);
    } else if (active.isContentEditable) {
      // For contenteditable elements
      document.execCommand("insertText", false, context.body);
    }
    return;
  }
  
  // Find common AI chat input selectors
  const selectors = [
    'textarea[placeholder*="message" i]',
    'textarea[placeholder*="chat" i]',
    'div[contenteditable="true"][data-placeholder*="message" i]',
    'div[contenteditable="true"]',
    'textarea',
    'input[type="text"]'
  ];
  
  let targetElement = null;
  for (const selector of selectors) {
    targetElement = document.querySelector(selector);
    if (targetElement) break;
  }
  
  if (targetElement) {
    targetElement.focus();
    
    if (targetElement.tagName === "TEXTAREA" || targetElement.tagName === "INPUT") {
      targetElement.value = (targetElement.value || "") + context.body;
      targetElement.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (targetElement.isContentEditable) {
      targetElement.textContent = (targetElement.textContent || "") + context.body;
      targetElement.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return;
  }
  
  // Fallback to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(context.body).then(() => {
      showNotification("Context copied to clipboard!");
    }).catch(() => {
      showNotification("Failed to copy context");
    });
  } else {
    // Legacy clipboard fallback
    const textarea = document.createElement("textarea");
    textarea.value = context.body;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showNotification("Context copied to clipboard!");
  }
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.top = "20px";
  notification.style.right = "20px";
  notification.style.background = "#333";
  notification.style.color = "#fff";
  notification.style.padding = "12px 16px";
  notification.style.borderRadius = "6px";
  notification.style.fontSize = "14px";
  notification.style.zIndex = "1000002";
  notification.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  notification.style.transform = "translateY(-10px)";
  notification.style.opacity = "0";
  notification.style.transition = "all 0.3s ease";
  
  document.body.appendChild(notification);
  
  requestAnimationFrame(() => {
    notification.style.transform = "translateY(0)";
    notification.style.opacity = "1";
  });
  
  setTimeout(() => {
    notification.style.transform = "translateY(-10px)";
    notification.style.opacity = "0";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function siteSupported() {
  const host = window.location.host;
  return SUPPORTED_SITES.some(s => host.includes(s.hostIncludes));
}

// Initialize
if (siteSupported()) {
  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createFloatingButton);
  } else {
    createFloatingButton();
  }
}