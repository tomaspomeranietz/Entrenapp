import "../components/site-header.js";
import { supabase } from "../supabaseClient.js";
import { updatePassword, translateAuthError } from "../auth.js";
import { reveal } from "../guard.js";
import { $, getFormValues } from "../utils/dom.js";
import { showSuccess, showError } from "../utils/toast.js";

const form = $("#reset-form");
const invalidMsg = $("#invalid-link");

let hasRecoverySession = false;

// El link del mail deja una sesión de recuperación temporal; supabase-js la
// detecta sola en la URL (detectSessionInUrl, default) y dispara este evento.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY" || (session && !hasRecoverySession)) {
    hasRecoverySession = true;
    form.hidden = false;
    invalidMsg.hidden = true;
    reveal();
  }
});

setTimeout(() => {
  if (!hasRecoverySession) {
    form.hidden = true;
    invalidMsg.hidden = false;
  }
  reveal();
}, 1500);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const { password } = getFormValues(form);
    await updatePassword(password);
    showSuccess("Contraseña actualizada. Ya podés ingresar.");
    setTimeout(() => (location.href = "login.html"), 1200);
  } catch (err) {
    showError(translateAuthError(err));
    submitBtn.disabled = false;
  }
});
