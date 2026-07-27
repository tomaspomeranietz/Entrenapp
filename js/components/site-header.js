// <site-header>: nav dinámico según haya o no sesión, y según el rol.
// Se usa en todas las páginas: <site-header></site-header> dentro de un <header class="site-header">.
import { getSessionAndProfile } from "../guard.js";
import { signOut } from "../auth.js";
import { escapeHtml } from "../utils/dom.js";

class SiteHeader extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = `
      <a class="site-header__logo" href="index.html">
        <span class="site-header__logo-mark">💪</span>
        Entrenapp
      </a>
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

    const dashboardLink =
      profile.role === "preparador"
        ? `<a class="site-header__link" href="dashboard-trainer.html">Mi panel</a>`
        : `<a class="site-header__link" href="index.html">Preparadores</a>`;

    const initial = escapeHtml((profile.full_name || "?").trim().slice(0, 1).toUpperCase());
    const avatarInner = profile.avatar_url
      ? `<img src="${escapeHtml(profile.avatar_url)}" alt="">`
      : initial;

    return `
      ${dashboardLink}
      <a class="site-header__link" href="messages.html">Mensajes</a>
      <a href="account.html" title="Mi cuenta" aria-label="Mi cuenta">
        <span class="avatar" style="width:32px;height:32px;font-size:.8rem;">${avatarInner}</span>
      </a>
      <button class="btn btn--ghost btn--sm" type="button" data-action="logout">Salir</button>
    `;
  }

  bindEvents(nav) {
    const logoutBtn = nav.querySelector('[data-action="logout"]');
    if (!logoutBtn) return;
    logoutBtn.addEventListener("click", async () => {
      logoutBtn.disabled = true;
      await signOut();
      location.href = "index.html";
    });
  }
}

customElements.define("site-header", SiteHeader);
