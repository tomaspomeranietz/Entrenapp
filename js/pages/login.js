import "../components/site-header.js";
import { signIn, translateAuthError } from "../auth.js";
import { redirectIfAuthenticated } from "../guard.js";
import { $, getFormValues } from "../utils/dom.js";
import { showError } from "../utils/toast.js";

// Solo permite volver a una página propia del sitio (nunca a otro dominio):
// evita que un link armado a mano con ?redirect=https://otro-sitio te mande
// ahí ya logueado.
function safeRedirect(value) {
  if (value && /^\/?[a-z0-9_-]+\.html([?#].*)?$/i.test(value)) return value;
  return "index.html";
}

await redirectIfAuthenticated();

const form = $("#login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const { email, password } = getFormValues(form);
    await signIn({ email, password });
    const redirect = new URLSearchParams(location.search).get("redirect");
    location.href = safeRedirect(redirect);
  } catch (err) {
    showError(translateAuthError(err));
    submitBtn.disabled = false;
  }
});
