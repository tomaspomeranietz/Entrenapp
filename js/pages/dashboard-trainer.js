import "../components/site-header.js";
import "../components/star-rating.js";
import { requireRole } from "../guard.js";
import { getMyProfile, updateCurrentFocus } from "../data/profiles.js";
import { listMyRoutines, createRoutine, updateRoutine, deleteRoutine } from "../data/routines.js";
import { uploadRoutineMedia, deleteRoutineMedia } from "../data/routine-media.js";
import {
  listMyAvailability,
  createSlot,
  updateSlot,
  toggleSlotAvailability,
  deleteSlot,
} from "../data/availability.js";
import { listMyPricing, createPricingItem, updatePricingItem, deletePricingItem } from "../data/pricing.js";
import { listReviewsForTrainer } from "../data/reviews.js";
import { upsertReply } from "../data/replies.js";
import { $, $$, escapeHtml, getFormValues } from "../utils/dom.js";
import { formatCurrency, formatTimeRange, formatRelativeTime, levelLabel, truncate, initials } from "../utils/format.js";
import { showError, showSuccess } from "../utils/toast.js";

main();

async function main() {
  const auth = await requireRole(["preparador"]);
  if (!auth) return;
  const trainerId = auth.profile.id;

  initTabs();
  initFocusForm(trainerId);
  refreshRoutines(trainerId);
  refreshSlots(trainerId);
  refreshPricing(trainerId);
  refreshReviews(trainerId);

  $("#new-routine-btn").addEventListener("click", () => openRoutineModal(trainerId));
  $("#new-slot-btn").addEventListener("click", () => openSlotModal(trainerId));
  $("#new-price-btn").addEventListener("click", () => openPriceModal(trainerId));
}

// ---------- Tabs ----------
function initTabs() {
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const tab = btn.dataset.tab;
      $$("[data-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.panel !== tab;
      });
    });
  });
}

// ---------- Estado semanal ----------
async function initFocusForm(trainerId) {
  const profile = await getMyProfile(trainerId).catch(() => null);
  $("#focus-text").value = profile?.current_focus || "";
  $("#focus-updated").textContent = profile?.current_focus_updated_at
    ? `Última actualización: ${formatRelativeTime(profile.current_focus_updated_at)}`
    : "Todavía no publicaste nada.";

  $("#focus-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await updateCurrentFocus(trainerId, $("#focus-text").value.trim());
      $("#focus-updated").textContent = "Última actualización: recién";
      showSuccess("Actualizado.");
    } catch (err) {
      console.error(err);
      showError("No pudimos guardar el estado.");
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------- Helper compartido para acciones de fila (editar/borrar/etc) ----------
function bindRowActions(list, items, handlers) {
  list.querySelectorAll("[data-action]").forEach((btn) => {
    const handler = handlers[btn.dataset.action];
    if (!handler) return;
    btn.addEventListener("click", async () => {
      const id = btn.closest("[data-id]").dataset.id;
      const item = items.find((i) => i.id === id);
      try {
        await handler(item);
      } catch (err) {
        console.error(err);
        showError("Algo salió mal. Probá de nuevo.");
      }
    });
  });
}

// ---------- Modal genérico ----------
function openModal(title, bodyHtml) {
  const root = $("#modal-root");
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
  $("#modal-close").addEventListener("click", closeModal);
  $("#modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
  document.addEventListener("keydown", escListener);
}

function closeModal() {
  $("#modal-root").innerHTML = "";
  document.removeEventListener("keydown", escListener);
}

function escListener(e) {
  if (e.key === "Escape") closeModal();
}

// ---------- Rutinas ----------
async function refreshRoutines(trainerId) {
  const list = $("#routines-list");
  list.innerHTML = `<div class="skeleton" style="height:60px;"></div>`;
  const routines = await listMyRoutines(trainerId).catch(() => []);

  if (!routines.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-state__emoji">📋</span><p>Todavía no cargaste rutinas.</p></div>`;
    return;
  }

  list.innerHTML = routines
    .map(
      (r) => `
      <div class="dashboard-row" data-id="${r.id}">
        <div class="dashboard-row__main">
          <div class="dashboard-row__title">
            ${escapeHtml(r.title)}
            ${r.is_published ? "" : `<span class="badge">Oculta</span>`}
            ${r.routine_media?.length ? `<span class="badge">📷 ${r.routine_media.length}</span>` : ""}
          </div>
          <div class="text-secondary" style="font-size:.85rem;">${[r.level ? levelLabel(r.level) : null, r.description ? truncate(r.description, 80) : null]
            .filter(Boolean)
            .map(escapeHtml)
            .join(" · ")}</div>
        </div>
        <div class="dashboard-row__actions">
          <button class="btn btn--ghost btn--sm" data-action="edit">Editar</button>
          <button class="btn btn--ghost btn--sm" data-action="delete">Borrar</button>
        </div>
      </div>
    `
    )
    .join("");

  bindRowActions(list, routines, {
    edit: (routine) => openRoutineModal(trainerId, routine),
    delete: async (routine) => {
      if (!confirm("¿Borrar esta rutina?")) return;
      await deleteRoutine(routine.id);
      showSuccess("Rutina borrada.");
      refreshRoutines(trainerId);
    },
  });
}

function openRoutineModal(trainerId, routine = null) {
  const isEdit = Boolean(routine);
  openModal(
    isEdit ? "Editar rutina" : "Nueva rutina",
    `
    <form id="routine-form">
      <div class="field">
        <label for="r-title">Título</label>
        <input class="input" id="r-title" name="title" required maxlength="120" value="${routine ? escapeHtml(routine.title) : ""}" />
      </div>
      <div class="field">
        <label for="r-level">Nivel</label>
        <select class="select" id="r-level" name="level">
          <option value="">Sin especificar</option>
          <option value="principiante" ${routine?.level === "principiante" ? "selected" : ""}>Principiante</option>
          <option value="intermedio" ${routine?.level === "intermedio" ? "selected" : ""}>Intermedio</option>
          <option value="avanzado" ${routine?.level === "avanzado" ? "selected" : ""}>Avanzado</option>
        </select>
      </div>
      <div class="field">
        <label for="r-desc">Descripción</label>
        <textarea class="textarea" id="r-desc" name="description" maxlength="1000">${routine ? escapeHtml(routine.description || "") : ""}</textarea>
      </div>
      <div class="field" style="flex-direction:row; align-items:center; gap:8px;">
        <input type="checkbox" id="r-published" name="is_published" ${!routine || routine.is_published ? "checked" : ""} style="width:auto;" />
        <label for="r-published" style="margin:0;">Publicada (visible para alumnos)</label>
      </div>
      <div class="field">
        <label>Fotos y videos</label>
        ${
          isEdit
            ? `<div class="media-grid" id="media-grid">${renderMediaGrid(routine.routine_media || [])}</div>
               <input type="file" id="r-media-input" accept="image/*,video/*" multiple style="margin-top:8px;" />
               <span class="field-hint">Hasta 50MB por archivo.</span>`
            : `<span class="field-hint">Podés sumarle fotos y videos apenas la crees.</span>`
        }
      </div>
      <button class="btn btn--primary" type="submit">${isEdit ? "Guardar cambios" : "Publicar rutina"}</button>
    </form>
  `
  );

  if (isEdit) bindMediaManager(trainerId, routine);

  $("#routine-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const values = getFormValues(e.target);
      const fields = {
        title: values.title.trim(),
        level: values.level || null,
        description: values.description?.trim() || null,
        is_published: e.target.querySelector("#r-published").checked,
      };
      if (isEdit) {
        await updateRoutine(routine.id, fields);
        showSuccess("Rutina actualizada.");
        closeModal();
        refreshRoutines(trainerId);
      } else {
        const created = await createRoutine(trainerId, fields);
        showSuccess("Rutina publicada.");
        refreshRoutines(trainerId);
        openRoutineModal(trainerId, { ...created, routine_media: [] });
      }
    } catch (err) {
      console.error(err);
      showError("No pudimos guardar la rutina.");
      btn.disabled = false;
    }
  });
}

function renderMediaGrid(media) {
  if (!media.length) return `<p class="text-secondary" style="font-size:.85rem;">Todavía no subiste nada.</p>`;
  return media
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(
      (m) => `
      <div class="media-thumb" data-media-id="${m.id}">
        ${
          m.media_type === "video"
            ? `<video src="${escapeHtml(m.url)}" preload="metadata" muted></video>`
            : `<img src="${escapeHtml(m.url)}" alt="" />`
        }
        <button type="button" class="media-thumb__remove" data-action="remove-media" aria-label="Borrar">✕</button>
      </div>
    `
    )
    .join("");
}

// Sube y borra fotos/video al toque (no espera al submit del form de la
// rutina) para que el trainer vea el resultado enseguida.
function bindMediaManager(trainerId, routine) {
  let media = routine.routine_media || [];
  const grid = $("#media-grid");
  const input = $("#r-media-input");

  const rerender = () => {
    grid.innerHTML = renderMediaGrid(media);
    bindRemoveButtons();
  };

  function bindRemoveButtons() {
    grid.querySelectorAll("[data-action='remove-media']").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest("[data-media-id]").dataset.mediaId;
        const item = media.find((m) => m.id === id);
        btn.disabled = true;
        try {
          await deleteRoutineMedia(item);
          media = media.filter((m) => m.id !== id);
          rerender();
          refreshRoutines(trainerId);
        } catch (err) {
          console.error(err);
          showError("No pudimos borrar el archivo.");
          btn.disabled = false;
        }
      });
    });
  }
  bindRemoveButtons();

  input.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = "";
    for (const file of files) {
      try {
        const created = await uploadRoutineMedia(trainerId, routine.id, file, media.length);
        media = [...media, created];
        rerender();
      } catch (err) {
        console.error(err);
        showError(err.message || "No pudimos subir el archivo.");
      }
    }
    refreshRoutines(trainerId);
  });
}

// ---------- Turnos ----------
async function refreshSlots(trainerId) {
  const list = $("#slots-list");
  list.innerHTML = `<div class="skeleton" style="height:60px;"></div>`;
  const slots = await listMyAvailability(trainerId).catch(() => []);

  if (!slots.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-state__emoji">🗓️</span><p>Todavía no publicaste turnos.</p></div>`;
    return;
  }

  list.innerHTML = slots
    .map(
      (s) => `
      <div class="dashboard-row" data-id="${s.id}">
        <div class="dashboard-row__main">
          <div class="dashboard-row__title">${escapeHtml(formatTimeRange(s.starts_at, s.ends_at))} ${s.is_available ? "" : `<span class="badge">Ocupado</span>`}</div>
          ${s.label ? `<div class="text-secondary" style="font-size:.85rem;">${escapeHtml(s.label)}</div>` : ""}
        </div>
        <div class="dashboard-row__actions">
          <button class="btn btn--ghost btn--sm" data-action="edit">Editar</button>
          <button class="btn btn--ghost btn--sm" data-action="toggle">${s.is_available ? "Marcar ocupado" : "Marcar libre"}</button>
          <button class="btn btn--ghost btn--sm" data-action="delete">Borrar</button>
        </div>
      </div>
    `
    )
    .join("");

  bindRowActions(list, slots, {
    edit: (slot) => openSlotModal(trainerId, slot),
    toggle: async (slot) => {
      await toggleSlotAvailability(slot.id, !slot.is_available);
      refreshSlots(trainerId);
    },
    delete: async (slot) => {
      if (!confirm("¿Borrar este turno?")) return;
      await deleteSlot(slot.id);
      showSuccess("Turno borrado.");
      refreshSlots(trainerId);
    },
  });
}

function openSlotModal(trainerId, slot = null) {
  const isEdit = Boolean(slot);
  openModal(
    isEdit ? "Editar turno" : "Nuevo turno",
    `
    <form id="slot-form">
      <div class="field">
        <label for="s-start">Desde</label>
        <input class="input" type="datetime-local" id="s-start" name="starts_at" required value="${slot ? toDatetimeLocal(slot.starts_at) : ""}" />
      </div>
      <div class="field">
        <label for="s-end">Hasta</label>
        <input class="input" type="datetime-local" id="s-end" name="ends_at" required value="${slot ? toDatetimeLocal(slot.ends_at) : ""}" />
      </div>
      <div class="field">
        <label for="s-label">Descripción (opcional)</label>
        <input class="input" type="text" id="s-label" name="label" placeholder="Ej: Funcional grupal" maxlength="100" value="${slot?.label ? escapeHtml(slot.label) : ""}" />
      </div>
      <button class="btn btn--primary" type="submit">${isEdit ? "Guardar cambios" : "Publicar turno"}</button>
    </form>
  `
  );

  $("#slot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const values = getFormValues(e.target);
      const starts = new Date(values.starts_at);
      const ends = new Date(values.ends_at);
      if (!(ends > starts)) {
        showError("El horario de fin tiene que ser después del inicio.");
        btn.disabled = false;
        return;
      }
      const fields = {
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        label: values.label?.trim() || null,
      };
      if (isEdit) await updateSlot(slot.id, fields);
      else await createSlot(trainerId, fields);
      showSuccess(isEdit ? "Turno actualizado." : "Turno publicado.");
      closeModal();
      refreshSlots(trainerId);
    } catch (err) {
      console.error(err);
      showError("No pudimos guardar el turno.");
      btn.disabled = false;
    }
  });
}

function toDatetimeLocal(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- Precios y promos ----------
async function refreshPricing(trainerId) {
  const list = $("#pricing-list");
  list.innerHTML = `<div class="skeleton" style="height:60px;"></div>`;
  const items = await listMyPricing(trainerId).catch(() => []);

  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-state__emoji">💵</span><p>Todavía no cargaste precios.</p></div>`;
    return;
  }

  list.innerHTML = items
    .map(
      (p) => `
      <div class="dashboard-row" data-id="${p.id}">
        <div class="dashboard-row__main">
          <div class="dashboard-row__title">
            ${escapeHtml(p.title)}
            ${p.is_promo ? `<span class="badge badge--promo">Promo</span>` : ""}
            ${p.active ? "" : `<span class="badge">Inactivo</span>`}
          </div>
          <div class="text-secondary" style="font-size:.85rem;">${escapeHtml(formatCurrency(p.price, p.currency))}</div>
        </div>
        <div class="dashboard-row__actions">
          <button class="btn btn--ghost btn--sm" data-action="edit">Editar</button>
          <button class="btn btn--ghost btn--sm" data-action="toggle">${p.active ? "Desactivar" : "Activar"}</button>
          <button class="btn btn--ghost btn--sm" data-action="delete">Borrar</button>
        </div>
      </div>
    `
    )
    .join("");

  bindRowActions(list, items, {
    edit: (item) => openPriceModal(trainerId, item),
    toggle: async (item) => {
      await updatePricingItem(item.id, { active: !item.active });
      refreshPricing(trainerId);
    },
    delete: async (item) => {
      if (!confirm("¿Borrar este precio?")) return;
      await deletePricingItem(item.id);
      showSuccess("Precio borrado.");
      refreshPricing(trainerId);
    },
  });
}

function openPriceModal(trainerId, item = null) {
  const isEdit = Boolean(item);
  openModal(
    isEdit ? "Editar precio" : "Nuevo precio",
    `
    <form id="price-form">
      <div class="field">
        <label for="p-title">Título</label>
        <input class="input" id="p-title" name="title" required maxlength="120" value="${item ? escapeHtml(item.title) : ""}" placeholder="Ej: Plan mensual 3x semana" />
      </div>
      <div class="field">
        <label for="p-price">Precio (dejalo vacío para "a consultar")</label>
        <input class="input" type="number" min="0" step="0.01" id="p-price" name="price" value="${item?.price ?? ""}" />
      </div>
      <div class="field">
        <label for="p-desc">Descripción (opcional)</label>
        <textarea class="textarea" id="p-desc" name="description" maxlength="500">${item ? escapeHtml(item.description || "") : ""}</textarea>
      </div>
      <div class="field" style="flex-direction:row; align-items:center; gap:8px;">
        <input type="checkbox" id="p-promo" name="is_promo" ${item?.is_promo ? "checked" : ""} style="width:auto;" />
        <label for="p-promo" style="margin:0;">Es una promo</label>
      </div>
      <button class="btn btn--primary" type="submit">${isEdit ? "Guardar cambios" : "Publicar precio"}</button>
    </form>
  `
  );

  $("#price-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const values = getFormValues(e.target);
      const fields = {
        title: values.title.trim(),
        price: values.price ? Number(values.price) : null,
        description: values.description?.trim() || null,
        is_promo: e.target.querySelector("#p-promo").checked,
      };
      if (isEdit) await updatePricingItem(item.id, fields);
      else await createPricingItem(trainerId, fields);
      showSuccess(isEdit ? "Precio actualizado." : "Precio publicado.");
      closeModal();
      refreshPricing(trainerId);
    } catch (err) {
      console.error(err);
      showError("No pudimos guardar el precio.");
      btn.disabled = false;
    }
  });
}

// ---------- Reseñas ----------
async function refreshReviews(trainerId) {
  const list = $("#reviews-list");
  list.innerHTML = `<div class="skeleton" style="height:60px;"></div>`;
  const reviews = await listReviewsForTrainer(trainerId).catch(() => []);

  if (!reviews.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-state__emoji">⭐</span><p>Todavía no tenés reseñas.</p></div>`;
    return;
  }

  list.innerHTML = reviews
    .map((r) => {
      const reply = r.review_replies;
      return `
      <div class="list-item review" data-review-id="${r.id}">
        <div class="review__head">
          <span class="avatar" style="width:36px;height:36px;font-size:.8rem;">${escapeHtml(initials(r.student?.full_name))}</span>
          <div>
            <div style="font-weight:600;">${escapeHtml(r.student?.full_name || "Alumno")}</div>
            <star-rating value="${r.rating}"></star-rating>
          </div>
          <span class="text-faint" style="margin-left:auto; font-size:.8rem;">${formatRelativeTime(r.created_at)}</span>
        </div>
        ${r.comment ? `<p>${escapeHtml(r.comment)}</p>` : ""}
        <div class="reply-slot">
          ${
            reply
              ? `<div class="review__reply"><span class="review__reply-label">Tu respuesta</span>${escapeHtml(reply.body)}</div>
                 <button class="btn btn--ghost btn--sm" data-action="edit-reply" style="margin-top:8px;">Editar respuesta</button>`
              : `<button class="btn btn--outline btn--sm" data-action="reply" style="margin-top:8px;">Responder</button>`
          }
        </div>
      </div>
    `;
    })
    .join("");

  list.querySelectorAll("[data-action='reply'], [data-action='edit-reply']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest("[data-review-id]");
      const reviewId = row.dataset.reviewId;
      const review = reviews.find((r) => r.id === reviewId);
      openReplyForm(row, trainerId, reviewId, review.review_replies?.body || "");
    });
  });

  function openReplyForm(row, trainerId, reviewId, existingBody) {
    const slot = row.querySelector(".reply-slot");
    slot.innerHTML = `
      <form class="reply-form" style="margin-top:8px;">
        <div class="field">
          <textarea class="textarea" name="body" required maxlength="1000" placeholder="Escribí tu respuesta…">${escapeHtml(existingBody)}</textarea>
        </div>
        <button class="btn btn--primary btn--sm" type="submit">Guardar respuesta</button>
        <button class="btn btn--ghost btn--sm" type="button" data-action="cancel-reply">Cancelar</button>
      </form>
    `;
    slot.querySelector("[data-action='cancel-reply']").addEventListener("click", () => refreshReviews(trainerId));
    slot.querySelector(".reply-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const body = new FormData(ev.target).get("body").toString().trim();
      if (!body) return;
      const submitBtn = ev.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        await upsertReply(reviewId, trainerId, body);
        showSuccess("Respuesta guardada.");
        refreshReviews(trainerId);
      } catch (err) {
        console.error(err);
        showError("No pudimos guardar la respuesta.");
        submitBtn.disabled = false;
      }
    });
  }
}
