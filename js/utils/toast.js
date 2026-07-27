let root = null;

function ensureRoot() {
  if (!root || !root.isConnected) {
    root = document.getElementById("toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "toast-root";
      document.body.appendChild(root);
    }
  }
  return root;
}

export function showToast(message, type = "default") {
  const container = ensureRoot();
  const toast = document.createElement("div");
  toast.className = type !== "default" ? `toast toast--${type}` : "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.2s ease";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

export function showError(message) {
  showToast(message, "error");
}

export function showSuccess(message) {
  showToast(message, "success");
}
