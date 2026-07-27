import "../components/site-header.js";
import { requireAuth } from "../guard.js";
import { getMyProfile, updateProfile, uploadAvatar } from "../data/profiles.js";
import { updatePassword, translateAuthError } from "../auth.js";
import { $, escapeHtml } from "../utils/dom.js";
import { initials } from "../utils/format.js";
import { showError, showSuccess } from "../utils/toast.js";

main();

async function main() {
  const auth = await requireAuth();
  if (!auth) return;
  const userId = auth.profile.id;

  const profile = await getMyProfile(userId);
  fillForm(profile);
  if (profile.role === "preparador") {
    $("#trainer-fields").hidden = false;
  }

  $("#avatar-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadAvatar(userId, file);
      $("#avatar-preview").innerHTML = `<img src="${escapeHtml(url)}" alt="">`;
      showSuccess("Foto actualizada.");
    } catch (err) {
      console.error(err);
      showError("No pudimos subir la foto.");
    }
  });

  $("#profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const fields = {
        full_name: $("#full_name").value.trim(),
        city: $("#city").value.trim() || null,
        bio: $("#bio").value.trim() || null,
      };
      if (profile.role === "preparador") {
        fields.modality = $("#modality").value || null;
        fields.specialties = $("#specialties")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        fields.years_experience = $("#years_experience").value ? Number($("#years_experience").value) : null;
        fields.certifications = $("#certifications").value.trim() || null;
      }
      await updateProfile(userId, fields);
      showSuccess("Perfil actualizado.");
    } catch (err) {
      console.error(err);
      showError("No pudimos guardar los cambios.");
    } finally {
      btn.disabled = false;
    }
  });

  $("#password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await updatePassword($("#new-password").value);
      showSuccess("Contraseña actualizada.");
      e.target.reset();
    } catch (err) {
      showError(translateAuthError(err));
    } finally {
      btn.disabled = false;
    }
  });
}

function fillForm(profile) {
  $("#full_name").value = profile.full_name || "";
  $("#city").value = profile.city || "";
  $("#bio").value = profile.bio || "";
  $("#avatar-preview").innerHTML = profile.avatar_url
    ? `<img src="${escapeHtml(profile.avatar_url)}" alt="">`
    : escapeHtml(initials(profile.full_name));

  if (profile.role === "preparador") {
    $("#modality").value = profile.modality || "";
    $("#specialties").value = (profile.specialties || []).join(", ");
    $("#years_experience").value = profile.years_experience ?? "";
    $("#certifications").value = profile.certifications || "";
  }
}
