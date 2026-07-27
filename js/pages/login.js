import "../components/site-header.js";
import { signIn, translateAuthError } from "../auth.js";
import { redirectIfAuthenticated } from "../guard.js";
import { $, getFormValues } from "../utils/dom.js";
import { showError } from "../utils/toast.js";

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
    location.href = redirect || "index.html";
  } catch (err) {
    showError(translateAuthError(err));
    submitBtn.disabled = false;
  }
});
