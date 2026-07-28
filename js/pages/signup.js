import "../components/site-header.js";
import { signUp, translateAuthError } from "../auth.js";
import { redirectIfAuthenticated } from "../guard.js";
import { $, getFormValues } from "../utils/dom.js";
import { showError } from "../utils/toast.js";

await redirectIfAuthenticated();

const form = $("#signup-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const { role, full_name, email, password } = getFormValues(form);
    const { session } = await signUp({ email, password, fullName: full_name, role });
    if (session) {
      // Confirmación de email desactivada: queda logueado directo.
      location.href = role === "preparador" ? "dashboard-trainer.html" : "index.html";
      return;
    }
    // Confirmación de email activada: todavía no hay sesión hasta que
    // toque el link que le llega por mail.
    $("#confirm-email-address").textContent = email;
    $("#signup-form-view").hidden = true;
    $("#confirm-email-msg").hidden = false;
  } catch (err) {
    showError(translateAuthError(err));
    submitBtn.disabled = false;
  }
});
