// <site-header>: nav dinámico según haya o no sesión, y según el rol.
// Se usa en todas las páginas: <site-header></site-header> dentro de un <header class="site-header">.
import { getSessionAndProfile } from "../guard.js";
import { signOut } from "../auth.js";
import { escapeHtml } from "../utils/dom.js";

class SiteHeader extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = `
      <a class="site-header__logo" href="index.html">
        <img class="site-header__logo-mark" src="assets/img/icon-512.png" alt="" width="32" height="32" />
        Entrenapp
      </a>
      <button class="site-header__toggle" type="button" aria-label="Abrir menú" aria-expanded="false">
        <span class="site-header__toggle-bar"></span>
        <span class="site-header__toggle-bar"></span>
        <span class="site-header__toggle-bar"></span>
      </button>
      <nav class="site-header__nav" aria-label="Principal"></nav>
    `;
    const nav = this.querySelector(".site-header__nav");
    nav.innerHTML = `<span class="skeleton" style="width:120px;height:36px;border-radius:999px;display:inline-block;"></span>`;

    const { session, profile } = await getSessionAndProfile();
    nav.innerHTML = this.renderNav(session, profile);
    this.bindEvents(nav);
  }

  renderNav(session, profile) {
    if (!session || !profile) {
      return `
        <a class="site-header__link" href="index.html">Preparadores</a>
        <a class="btn btn--outline btn--sm" href="login.html">Ingresar</a>
        <a class="btn btn--primary btn--sm" href="signup.html">Registrarme</a>
      `;
    }

    const isTrainer = profile.role === "preparador";
    const dashboardLink = isTrainer
      ? `<a class="site-header__link" href="dashboard-trainer.html">Mi panel</a>`
      : `<a class="site-header__link" href="index.html">Preparadores</a>`;

    const initial = escapeHtml((profile.full_name || "?").trim().slice(0, 1).toUpperCase());
    const avatarInner = profile.avatar_url
      ? `<img src="${escapeHtml(profile.avatar_url)}" alt="">`
      : initial;

    return `
      <span class="badge ${isTrainer ? "badge--role-preparador" : "badge--role-alumno"} site-header__role">
        ${isTrainer ? "Estás en un perfil de preparador físico" : "Estás en un perfil de alumno"}
      </span>
      ${dashboardLink}
      <a class="site-header__link" href="messages.html">Mensajes</a>
      <a href="account.html" title="Mi cuenta" aria-label="Mi cuenta">
        <span class="avatar" style="width:32px;height:32px;font-size:.8rem;">${avatarInner}</span>
      </a>
      <button class="btn btn--ghost btn--sm" type="button" data-action="logout">Salir</button>
    `;
  }

  bindEvents(nav) {
    const toggle = this.querySelector(".site-header__toggle");
    toggle.addEventListener("click", () => {
      const isOpen = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", isOpen);
      toggle.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    // En mobile el nav es un dropdown: cerrarlo al navegar o al tocar afuera.
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) this.closeMenu(nav, toggle);
    });
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("is-open") && !this.contains(e.target)) this.closeMenu(nav, toggle);
    });

    const logoutBtn = nav.querySelector('[data-action="logout"]');
    if (!logoutBtn) return;
    logoutBtn.addEventListener("click", async () => {
      logoutBtn.disabled = true;
      await signOut();
      location.href = "index.html";
    });
  }

  closeMenu(nav, toggle) {
    nav.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
}

customElements.define("site-header", SiteHeader);
