import "../components/site-header.js";
import "../components/star-rating.js";
import { getTrainerProfile } from "../data/profiles.js";
import { listPublishedRoutines } from "../data/routines.js";
import { listActivePricing } from "../data/pricing.js";
import { listUpcomingAvailability } from "../data/availability.js";
import { listReviewsForTrainer, getMyReviewFor, upsertMyReview } from "../data/reviews.js";
import { blockUser, unblockUser, isBlockedEitherWay, reportContent } from "../data/moderation.js";
import { getSessionAndProfile } from "../guard.js";
import { $, escapeHtml } from "../utils/dom.js";
import { initials, modalityLabel, levelLabel, formatCurrency, formatTimeRange, formatRelativeTime } from "../utils/format.js";
import { showError, showSuccess } from "../utils/toast.js";
import { openModal, closeModal } from "../utils/modal.js";

const trainerId = new URLSearchParams(location.search).get("id");
let currentViewer = { session: null, profile: null };

if (!trainerId) {
  showNotFound();
} else {
  init(trainerId);
}

async function init(id) {
  let trainer;
  try {
    trainer = await getTrainerProfile(id);
  } catch (err) {
    showNotFound();
    return;
  }

  document.title = `${trainer.full_name} — Entrenapp`;
  renderHero(trainer);
  $("#trainer-content").hidden = false;

  const [routines, pricing, availability, reviews, viewer] = await Promise.all([
    listPublishedRoutines(id).catch(() => []),
    listActivePricing(id).catch(() => []),
    listUpcomingAvailability(id).catch(() => []),
    listReviewsForTrainer(id).catch(() => []),
    getSessionAndProfile(),
  ]);
  currentViewer = viewer;

  renderRoutines(routines);
  renderPricing(pricing);
  renderAvailability(availability);
  renderReviews(reviews);
  renderMessageCta(viewer, id);

  const isSelf = viewer.profile && viewer.profile.id === id;
  const isStudent = viewer.profile && viewer.profile.role === "alumno" && !isSelf;
  if (isStudent) {
    renderReviewForm(id, viewer.profile.id);
  }
}

function showNotFound() {
  $("#trainer-hero").hidden = true;
  $("#not-found").hidden = false;
}

function renderHero(trainer) {
  const rating = trainer.avg_rating ?? 0;
  const meta = [trainer.city, modalityLabel(trainer.modality)].filter(Boolean).join(" · ");
  const specialties = (trainer.specialties || [])
    .map((s) => `<span class="badge">${escapeHtml(s)}</span>`)
    .join("");
  const avatarInner = trainer.avatar_url
    ? `<img src="${escapeHtml(trainer.avatar_url)}" alt="">`
    : escapeHtml(initials(trainer.full_name));

  $("#trainer-hero").innerHTML = `
    <div class="card">
      <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start;">
        <span class="avatar avatar--lg">${avatarInner}</span>
        <div style="flex:1; min-width:220px;">
          <h1>${escapeHtml(trainer.full_name)}</h1>
          ${meta ? `<p class="text-secondary">${escapeHtml(meta)}</p>` : ""}
          <div class="rating-summary" style="margin-top:8px;">
            <star-rating value="${Math.round(rating)}"></star-rating>
            <span class="rating-summary__count">${
              trainer.reviews_count ? `${rating.toFixed(1)} (${trainer.reviews_count} reseñas)` : "Sin reseñas todavía"
            }</span>
          </div>
          ${specialties ? `<div class="trainer-card__tags" style="margin-top:12px;">${specialties}</div>` : ""}
          <div id="message-cta" style="margin-top:16px;"></div>
        </div>
      </div>
      ${
        trainer.current_focus
          ? `<div class="badge badge--brand" style="margin-top:20px; display:block; padding:12px 16px; height:auto; border-radius:var(--radius-md); white-space:normal;">
              <strong>Esta semana:</strong> ${escapeHtml(trainer.current_focus)}
              <span class="text-faint" style="display:block; font-size:.75rem; margin-top:4px;">Actualizado ${formatRelativeTime(trainer.current_focus_updated_at)}</span>
            </div>`
          : ""
      }
      ${trainer.bio ? `<p style="margin-top:20px;">${escapeHtml(trainer.bio)}</p>` : ""}
    </div>
  `;
}

async function renderMessageCta(viewer, trainerId) {
  const el = $("#message-cta");
  const isSelf = viewer.profile && viewer.profile.id === trainerId;
  if (viewer.profile && viewer.profile.role === "alumno" && !isSelf) {
    el.innerHTML = `
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <a class="btn btn--primary" href="messages.html?with=${encodeURIComponent(trainerId)}">Mandar mensaje</a>
        <button class="btn btn--ghost btn--sm" type="button" id="report-trainer-btn">Reportar</button>
        <button class="btn btn--ghost btn--sm" type="button" id="block-trainer-btn">Bloquear</button>
      </div>
    `;
    $("#report-trainer-btn").addEventListener("click", () => openReportModal("user", trainerId, "este preparador"));

    const blockBtn = $("#block-trainer-btn");
    let blockedByMe = false;
    try {
      blockedByMe = (await isBlockedEitherWay(viewer.profile.id, trainerId)).blockedByMe;
    } catch (err) {
      console.error(err);
    }
    blockBtn.textContent = blockedByMe ? "Desbloquear" : "Bloquear";
    blockBtn.addEventListener("click", async () => {
      try {
        if (blockedByMe) {
          await unblockUser(viewer.profile.id, trainerId);
          showSuccess("Desbloqueado.");
        } else {
          if (!confirm("¿Bloquear a este preparador? No te va a poder volver a escribir.")) return;
          await blockUser(viewer.profile.id, trainerId);
          showSuccess("Bloqueado.");
        }
        renderMessageCta(viewer, trainerId);
      } catch (err) {
        console.error(err);
        showError("No pudimos actualizar el bloqueo.");
      }
    });
  } else if (!viewer.session) {
    el.innerHTML = `<a class="btn btn--primary" href="login.html?redirect=${encodeURIComponent(location.pathname + location.search)}">Ingresá para consultar</a>`;
  }
}

function openReportModal(targetType, targetId, label) {
  openModal(
    `Reportar ${label}`,
    `
    <form id="report-form">
      <div class="field">
        <label for="report-reason">Contanos qué pasó</label>
        <textarea class="textarea" id="report-reason" name="reason" required maxlength="500" placeholder="Describí el problema…"></textarea>
      </div>
      <button class="btn btn--primary" type="submit">Enviar reporte</button>
    </form>
  `
  );
  $("#report-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const reason = $("#report-reason").value.trim();
    if (!reason || !currentViewer.profile) return;
    btn.disabled = true;
    try {
      await reportContent(currentViewer.profile.id, targetType, targetId, reason);
      showSuccess("Reporte enviado. Gracias por avisar.");
      closeModal();
    } catch (err) {
      console.error(err);
      showError("No pudimos enviar el reporte.");
      btn.disabled = false;
    }
  });
}

function renderRoutines(routines) {
  const list = $("#routines-list");
  if (!routines.length) {
    list.innerHTML = `<p class="text-secondary">Todavía no publicó rutinas.</p>`;
    return;
  }
  list.innerHTML = routines
    .map(
      (r) => `
      <div class="list-item">
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
          <span class="dashboard-row__title">${escapeHtml(r.title)}</span>
          ${r.level ? `<span class="badge">${escapeHtml(levelLabel(r.level))}</span>` : ""}
        </div>
        ${r.description ? `<p class="text-secondary" style="margin-top:8px;">${escapeHtml(r.description)}</p>` : ""}
        ${renderRoutineMedia(r.routine_media)}
      </div>
    `
    )
    .join("");
}

function renderRoutineMedia(media) {
  if (!media || !media.length) return "";
  const items = media
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) =>
      m.media_type === "video"
        ? `<video src="${escapeHtml(m.url)}" preload="metadata" controls playsinline></video>`
        : `<img src="${escapeHtml(m.url)}" alt="" loading="lazy" data-action="open-lightbox" />`
    )
    .join("");
  return `<div class="media-gallery">${items}</div>`;
}

// Click en cualquier foto de una galería (event delegation: las galerías se
// re-renderizan seguido, así no hay que volver a bindear cada vez).
document.addEventListener("click", (e) => {
  const img = e.target.closest('.media-gallery img[data-action="open-lightbox"]');
  if (img) openLightbox(img.src);
});

function openLightbox(url) {
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="Cerrar">✕</button>
    <img src="${escapeHtml(url)}" alt="" />
  `;
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".lightbox__close")) close();
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
}

function renderPricing(items) {
  const list = $("#pricing-list");
  if (!items.length) {
    list.innerHTML = `<p class="text-secondary">Todavía no publicó precios.</p>`;
    return;
  }
  list.innerHTML = items
    .map(
      (p) => `
      <div class="list-item">
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
          <span class="dashboard-row__title">${escapeHtml(p.title)}</span>
          ${p.is_promo ? `<span class="badge badge--promo">Promo</span>` : ""}
        </div>
        <div style="font-weight:700; margin-top:4px;">${escapeHtml(formatCurrency(p.price, p.currency))}</div>
        ${p.description ? `<p class="text-secondary" style="margin-top:4px;">${escapeHtml(p.description)}</p>` : ""}
      </div>
    `
    )
    .join("");
}

function renderAvailability(slots) {
  const list = $("#availability-list");
  if (!slots.length) {
    list.innerHTML = `<p class="text-secondary">Sin turnos publicados por ahora.</p>`;
    return;
  }
  list.innerHTML = slots
    .map(
      (s) => `
      <div class="list-item">
        <div>${escapeHtml(formatTimeRange(s.starts_at, s.ends_at))}</div>
        ${s.label ? `<div class="text-secondary" style="font-size:.85rem;">${escapeHtml(s.label)}</div>` : ""}
      </div>
    `
    )
    .join("");
}

function renderReviews(reviews) {
  const list = $("#reviews-list");
  if (!reviews.length) {
    list.innerHTML = `<p class="text-secondary">Todavía no tiene reseñas.</p>`;
    return;
  }
  list.innerHTML = reviews
    .map((r) => {
      const reply = r.review_replies;
      const studentAvatar = r.student?.avatar_url
        ? `<img src="${escapeHtml(r.student.avatar_url)}" alt="">`
        : escapeHtml(initials(r.student?.full_name));
      return `
        <div class="list-item review" data-review-id="${r.id}">
          <div class="review__head">
            <span class="avatar" style="width:36px;height:36px;font-size:.8rem;">${studentAvatar}</span>
            <div>
              <div style="font-weight:600;">${escapeHtml(r.student?.full_name || "Alumno")}</div>
              <star-rating value="${r.rating}"></star-rating>
            </div>
            <span class="text-faint" style="margin-left:auto; font-size:.8rem;">${formatRelativeTime(r.created_at)}</span>
          </div>
          ${r.comment ? `<p>${escapeHtml(r.comment)}</p>` : ""}
          ${
            reply
              ? `<div class="review__reply">
                  <span class="review__reply-label">Respuesta del preparador</span>
                  ${escapeHtml(reply.body)}
                </div>`
              : ""
          }
          ${
            currentViewer.session
              ? `<button class="btn btn--ghost btn--sm" type="button" data-action="report-review" style="margin-top:4px;">Reportar</button>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  list.querySelectorAll("[data-action='report-review']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const reviewId = btn.closest("[data-review-id]").dataset.reviewId;
      openReportModal("review", reviewId, "esta reseña");
    });
  });
}

function renderReviewForm(trainerId, studentId) {
  const slot = $("#review-form-slot");
  slot.innerHTML = `<div class="skeleton" style="height:140px; margin-bottom:16px;"></div>`;

  getMyReviewFor(trainerId, studentId)
    .catch(() => null)
    .then((existing) => {
      slot.innerHTML = `
        <form id="review-form" style="border:1px solid var(--color-border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px;">
          <div class="field">
            <label>Tu puntaje</label>
            <div><star-rating interactive id="review-stars" value="${existing?.rating || 0}"></star-rating></div>
          </div>
          <div class="field">
            <label for="review-comment">Tu comentario (opcional)</label>
            <textarea class="textarea" id="review-comment" name="comment" maxlength="1000">${existing?.comment ? escapeHtml(existing.comment) : ""}</textarea>
          </div>
          <button class="btn btn--primary" type="submit">${existing ? "Actualizar reseña" : "Publicar reseña"}</button>
        </form>
      `;

      let currentRating = existing?.rating || 0;
      const starsEl = $("#review-stars", slot);
      starsEl.addEventListener("change", (e) => {
        currentRating = e.detail.value;
      });

      $("#review-form", slot).addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentRating) {
          showError("Elegí un puntaje antes de publicar.");
          return;
        }
        const comment = $("#review-comment", slot).value.trim();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          await upsertMyReview(trainerId, studentId, currentRating, comment || null);
          showSuccess("¡Gracias por tu reseña!");
          const reviews = await listReviewsForTrainer(trainerId);
          renderReviews(reviews);
        } catch (err) {
          console.error(err);
          showError("No pudimos guardar tu reseña.");
        } finally {
          btn.disabled = false;
        }
      });
    });
}
