import { supabase } from "../supabaseClient.js";

const BUCKET = "routine-media";
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // mismo límite configurado en el bucket (005_routine_media.sql)

export function mediaTypeFor(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

// Sube el archivo a Storage y crea la fila en routine_media. Devuelve la fila
// creada para poder pintarla sin tener que volver a pedir la lista entera.
export async function uploadRoutineMedia(trainerId, routineId, file, sortOrder) {
  const type = mediaTypeFor(file);
  if (!type) throw new Error("Solo se aceptan fotos o videos.");
  if (file.size > MAX_FILE_BYTES) throw new Error("El archivo no puede pesar más de 50MB.");

  const ext = file.name.includes(".") ? file.name.split(".").pop() : type === "image" ? "jpg" : "mp4";
  const path = `${trainerId}/${routineId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data, error: insertError } = await supabase
    .from("routine_media")
    .insert({ routine_id: routineId, trainer_id: trainerId, media_type: type, url: pub.publicUrl, sort_order: sortOrder })
    .select()
    .single();
  if (insertError) throw insertError;
  return data;
}

export async function deleteRoutineMedia(media) {
  const marker = `/${BUCKET}/`;
  const idx = media.url.indexOf(marker);
  if (idx !== -1) {
    await supabase.storage.from(BUCKET).remove([media.url.slice(idx + marker.length)]);
  }
  const { error } = await supabase.from("routine_media").delete().eq("id", media.id);
  if (error) throw error;
}
