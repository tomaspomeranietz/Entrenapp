import "../components/site-header.js";
import { sendPasswordReset, translateAuthError } from "../auth.js";
import { redirectIfAuthenticated } from "../guard.js";
import { $, getFormValues } from "../utils/dom.js";
import { showSuccess, showError } from "../utils/toast.js";

await redirectIfAuthenticated();

const form = $("#forgot-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const { email } = getFormValues(form);
    await sendPasswordReset(email);
    showSuccess("Listo, revisá tu email para el link.");
    form.reset();
  } catch (err) {
    showError(translateAuthError(err));
  } finally {
    submitBtn.disabled = false;
  }
});
