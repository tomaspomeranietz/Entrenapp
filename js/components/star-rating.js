// <star-rating value="4"></star-rating> — solo lectura.
// <star-rating interactive value="0"></star-rating> — clickeable, dispara
// un evento "change" con detail.value cuando el usuario elige un puntaje.
class StarRating extends HTMLElement {
  static get observedAttributes() {
    return ["value"];
  }

  connectedCallback() {
    this.interactive = this.hasAttribute("interactive");
    if (this.interactive) this.setAttribute("data-interactive", "");
    this.value = Number(this.getAttribute("value") || 0);
    this.render();
  }

  attributeChangedCallback() {
    if (!this.isConnected) return;
    this.value = Number(this.getAttribute("value") || 0);
    this.render();
  }

  render() {
    this.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.className = "star" + (i <= this.value ? " is-filled" : "");
      star.textContent = "★";
      star.setAttribute("aria-hidden", "true");
      if (this.interactive) {
        star.addEventListener("click", () => this.setValue(i));
        star.addEventListener("mouseenter", () => this.paintPreview(i));
        star.addEventListener("mouseleave", () => this.paintPreview(this.value));
      }
      this.appendChild(star);
    }
    const label = document.createElement("span");
    label.className = "visually-hidden";
    label.textContent = `${this.value} de 5 estrellas`;
    this.appendChild(label);
  }

  paintPreview(upTo) {
    this.querySelectorAll(".star").forEach((star, idx) => {
      star.classList.toggle("is-filled", idx < upTo);
    });
  }

  setValue(i) {
    this.value = i;
    this.setAttribute("value", String(i));
    this.dispatchEvent(new CustomEvent("change", { detail: { value: i }, bubbles: true }));
  }
}

customElements.define("star-rating", StarRating);
