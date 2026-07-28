import { supabase } from "../supabaseClient.js";

// Directorio público de preparadores, con rating promedio mezclado del lado
// del cliente (trainer_rating_summary es una vista sin FK directa a profiles,
// así que no se puede pedir embebida en el mismo select).
// modality: "presencial" o "online" muestra también a los que dan "ambos"
// (el alumno busca "¿este me sirve?", no "¿da nada más que esto?").
export async function listTrainers({ search = "", modality = "" } = {}) {
  let query = supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio, city, modality, specialties, current_focus, current_focus_updated_at")
    .eq("role", "preparador")
    .order("full_name", { ascending: true });

  const term = search.trim();
  if (term) {
    query = query.or(`full_name.ilike.%${term}%,city.ilike.%${term}%`);
  }
  if (modality === "presencial" || modality === "online") {
    query = query.or(`modality.eq.${modality},modality.eq.ambos`);
  }

  const { data: trainers, error } = await query;
  if (error) throw error;
  if (!trainers.length) return [];

  const { data: ratings } = await supabase
    .from("trainer_rating_summary")
    .select("trainer_id, avg_rating, reviews_count")
    .in("trainer_id", trainers.map((t) => t.id));

  const ratingByTrainer = new Map((ratings || []).map((r) => [r.trainer_id, r]));
  return trainers.map((t) => ({
    ...t,
    avg_rating: ratingByTrainer.get(t.id)?.avg_rating ?? null,
    reviews_count: ratingByTrainer.get(t.id)?.reviews_count ?? 0,
  }));
}

export async function getTrainerProfile(trainerId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", trainerId)
    .eq("role", "preparador")
    .single();
  if (error) throw error;

  const { data: ratingRow } = await supabase
    .from("trainer_rating_summary")
    .select("avg_rating, reviews_count")
    .eq("trainer_id", trainerId)
    .maybeSingle();

  return {
    ...data,
    avg_rating: ratingRow?.avg_rating ?? null,
    reviews_count: ratingRow?.reviews_count ?? 0,
  };
}

export async function getMyProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, fields) {
  const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
  if (error) throw error;
}

export async function updateCurrentFocus(userId, text) {
  return updateProfile(userId, {
    current_focus: text,
    current_focus_updated_at: new Date().toISOString(),
  });
}

const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // igual al límite configurado en el bucket (sql/006)

export async function uploadAvatar(userId, file) {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) throw new Error("Subí una foto en formato JPG, PNG, WEBP o GIF.");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("La foto no puede pesar más de 5MB.");
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  await updateProfile(userId, { avatar_url: data.publicUrl });
  return data.publicUrl;
}

// "Borrar cuenta": no hay forma de que el propio cliente borre su fila de
// auth.users (hace falta la service_role key, que nunca vive en el
// navegador), así que esto borra todo lo que sí puede borrar por RLS y
// vacía el perfil. El login en sí queda; si alguien pide la baja total,
// se borra a mano desde Authentication → Users en el dashboard de Supabase.
export async function deleteMyAccount(userId, role) {
  if (role === "preparador") {
    await supabase.from("routines").delete().eq("trainer_id", userId);
    await supabase.from("availability_slots").delete().eq("trainer_id", userId);
    await supabase.from("pricing_items").delete().eq("trainer_id", userId);
    await supabase.from("review_replies").delete().eq("trainer_id", userId);
  } else {
    await supabase.from("reviews").delete().eq("student_id", userId);
  }

  const { data: files } = await supabase.storage.from("avatars").list(userId);
  if (files?.length) {
    await supabase.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: "Usuario eliminado",
      avatar_url: null,
      bio: null,
      city: null,
      modality: null,
      specialties: null,
      years_experience: null,
      certifications: null,
      current_focus: null,
      current_focus_updated_at: null,
    })
    .eq("id", userId);
  if (error) throw error;
}
