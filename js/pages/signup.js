import "../components/site-header.js";
import { signUp, translateAuthError } from "../auth.js";
import { redirectIfAuthenticated } from "../guard.js";
import { $, getFormValues } from "../utils/dom.js";
import { showError } from "../utils/toast.js";

await redirectIfAuthenticated();

const form = $("#signup-form");
const cityField = $("#city-field");
const cityInput = $("#signup-city");
const explainerAlumno = $("#explainer-alumno");
const explainerPreparador = $("#explainer-preparador");

// La ciudad es obligatoria para preparador (para que el directorio sirva
// de algo) pero no tiene sentido pedírsela a un alumno. De paso, el texto
// de "para qué sirve" de abajo cambia según qué rol esté eligiendo.
function syncRoleUI() {
  const isTrainer = form.querySelector('input[name="role"]:checked')?.value === "preparador";
  cityField.hidden = !isTrainer;
  cityInput.required = isTrainer;
  explainerAlumno.hidden = isTrainer;
  explainerPreparador.hidden = !isTrainer;
}
form.querySelectorAll('input[name="role"]').forEach((r) => r.addEventListener("change", syncRoleUI));
syncRoleUI();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const { role, full_name, email, password, city } = getFormValues(form);
    const { session } = await signUp({ email, password, fullName: full_name, role, city: role === "preparador" ? city : null });
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
