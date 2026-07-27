// Wrappers finos sobre supabase.auth. Cada función tira el error para que
// cada página lo capture y muestre el mensaje con toast.js.
import { supabase } from "./supabaseClient.js";

export async function signUp({ email, password, fullName, role }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email) {
  const redirectTo = `${location.origin}/reset-password.html`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

const KNOWN_ERRORS = {
  "Invalid login credentials": "Email o contraseña incorrectos.",
  "User already registered": "Ya existe una cuenta con ese email.",
  "Password should be at least 6 characters": "La contraseña tiene que tener al menos 6 caracteres.",
};

export function translateAuthError(err) {
  const msg = err?.message || "";
  for (const [needle, translated] of Object.entries(KNOWN_ERRORS)) {
    if (msg.includes(needle)) return translated;
  }
  return msg || "Ocurrió un error. Probá de nuevo.";
}
