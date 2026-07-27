export function $(selector, scope = document) {
  return scope.querySelector(selector);
}

export function $$(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

// Usar SIEMPRE que se interpole texto de usuario (nombre, bio, comentario,
// mensaje, etc.) dentro de un template literal que después se asigna a
// innerHTML. Sin esto, un nombre o comentario con "<script>" sería XSS.
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function getFormValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}
