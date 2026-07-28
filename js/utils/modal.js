import { escapeHtml } from "./dom.js";

// Requiere que la página tenga <div id="modal-root"></div>.
export function openModal(title, bodyHtml) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="modal__head">
          <h3>${escapeHtml(title)}</h3>
          <button class="btn btn--ghost btn--icon" type="button" id="modal-close" aria-label="Cerrar">✕</button>
        </div>
        ${bodyHtml}
      </div>
    </div>
  `;
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
  document.addEventListener("keydown", escListener);
}

export function closeModal() {
  const root = document.getElementById("modal-root");
  if (root) root.innerHTML = "";
  document.removeEventListener("keydown", escListener);
}

function escListener(e) {
  if (e.key === "Escape") closeModal();
}
