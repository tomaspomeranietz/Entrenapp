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
    await signUp({ email, password, fullName: full_name, role });
    location.href = role === "preparador" ? "dashboard-trainer.html" : "index.html";
  } catch (err) {
    showError(translateAuthError(err));
    submitBtn.disabled = false;
  }
});
