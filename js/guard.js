// Protección de páginas del lado del cliente: no hay servidor/middleware
// (son .html estáticos), así que cada página protegida valida sesión y rol
// acá antes de mostrar contenido.
import { supabase } from "./supabaseClient.js";

export async function getSessionAndProfile() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { session: null, profile: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url")
    .eq("id", session.user.id)
    .single();

  if (error) return { session, profile: null };
  return { session, profile };
}

// Quita la clase que oculta .app-content (ver regla en css/base.css).
export function reveal() {
  document.body.classList.remove("auth-checking");
}

// Para páginas que solo alguno de los dos roles puede ver
// (ej. requireRole(["preparador"]) en dashboard-trainer.html).
export async function requireRole(allowedRoles) {
  const { session, profile } = await getSessionAndProfile();
  if (!session) {
    location.replace(`login.html?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    return null;
  }
  if (!profile || !allowedRoles.includes(profile.role)) {
    location.replace("index.html");
    return null;
  }
  reveal();
  return { session, profile };
}

// Para páginas que exigen estar logueado, sin importar el rol (mensajes, cuenta).
export function requireAuth() {
  return requireRole(["alumno", "preparador"]);
}

// Para login.html/signup.html: si ya hay sesión, mandar directo a donde corresponda.
export async function redirectIfAuthenticated() {
  const { session, profile } = await getSessionAndProfile();
  if (session && profile) {
    location.replace(profile.role === "preparador" ? "dashboard-trainer.html" : "index.html");
    return true;
  }
  reveal();
  return false;
}
