import "../components/site-header.js";
import "../components/star-rating.js";
import { listTrainers } from "../data/profiles.js";
import { $, escapeHtml } from "../utils/dom.js";
import { initials, modalityLabel, truncate } from "../utils/format.js";
import { showError } from "../utils/toast.js";

const grid = $("#trainers-grid");
const searchForm = $("#search-form");
const resultsTitle = $("#results-title");
const modalityFilters = $("#modality-filters");

let currentModality = "";

async function loadTrainers(search = "") {
  grid.innerHTML = skeletonCards();
  try {
    const trainers = await listTrainers({ search, modality: currentModality });
    renderTrainers(trainers, search);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p class="text-secondary">No pudimos cargar los preparadores. Probá de nuevo en un rato.</p>`;
    showError("No pudimos cargar los preparadores.");
  }
}

function renderTrainers(trainers, search) {
  resultsTitle.textContent = search ? `Preparadores · "${search}"` : "Preparadores";

  if (!trainers.length) {
    const hasFilters = Boolean(search) || Boolean(currentModality);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <span class="empty-state__emoji">🔍</span>
        <p>${hasFilters ? "No encontramos preparadores para esa búsqueda." : "Todavía no hay preparadores registrados."}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = trainers.map(renderTrainerCard).join("");
}

function renderTrainerCard(trainer) {
  const rating = trainer.avg_rating ?? 0;
  const meta = [trainer.city, modalityLabel(trainer.modality)].filter(Boolean).join(" · ");
  const specialties = (trainer.specialties || [])
    .slice(0, 3)
    .map((s) => `<span class="badge">${escapeHtml(s)}</span>`)
    .join("");
  const avatarInner = trainer.avatar_url
    ? `<img src="${escapeHtml(trainer.avatar_url)}" alt="">`
    : escapeHtml(initials(trainer.full_name));

  return `
    <a class="card trainer-card" href="trainer-profile.html?id=${encodeURIComponent(trainer.id)}">
      <div class="trainer-card__head">
        <span class="avatar">${avatarInner}</span>
        <div>
          <div class="trainer-card__name">${escapeHtml(trainer.full_name)}</div>
          ${meta ? `<div class="trainer-card__meta">${escapeHtml(meta)}</div>` : ""}
        </div>
      </div>
      <div class="rating-summary">
        <star-rating value="${Math.round(rating)}"></star-rating>
        <span class="rating-summary__count">${
          trainer.reviews_count ? `${rating.toFixed(1)} (${trainer.reviews_count})` : "Sin reseñas todavía"
        }</span>
      </div>
      ${trainer.bio ? `<p class="text-secondary">${escapeHtml(truncate(trainer.bio, 110))}</p>` : ""}
      ${specialties ? `<div class="trainer-card__tags">${specialties}</div>` : ""}
    </a>
  `;
}

function skeletonCards() {
  return Array.from({ length: 3 })
    .map(() => `<div class="card skeleton" style="height:180px;"></div>`)
    .join("");
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const search = new FormData(searchForm).get("search")?.toString() || "";
  loadTrainers(search);
});

modalityFilters.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-chip");
  if (!btn) return;
  currentModality = btn.dataset.modality;
  modalityFilters.querySelectorAll(".filter-chip").forEach((b) => b.classList.toggle("is-active", b === btn));
  const search = new FormData(searchForm).get("search")?.toString() || "";
  loadTrainers(search);
});

loadTrainers();
