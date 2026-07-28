import { supabase } from "../supabaseClient.js";

// El nombre/avatar del alumno se pide aparte contra la función
// get_profile_identities (no contra profiles directo): desde sql/006, un
// perfil de alumno solo se puede leer completo siendo uno mismo, así que el
// embed directo de PostgREST contra profiles ya no devolvería nada para
// otro alumno.
export async function listReviewsForTrainer(trainerId) {
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*, review_replies(*)")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!reviews.length) return reviews;

  const { data: students } = await supabase.rpc("get_profile_identities", {
    profile_ids: reviews.map((r) => r.student_id),
  });
  const byId = new Map((students || []).map((s) => [s.id, s]));

  return reviews.map((r) => ({ ...r, student: byId.get(r.student_id) || null }));
}

export async function getMyReviewFor(trainerId, studentId) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Upsert apoyado en el UNIQUE(trainer_id, student_id): si el alumno ya
// reseñó a este preparador, edita esa reseña en vez de crear una nueva.
export async function upsertMyReview(trainerId, studentId, rating, comment) {
  const { error } = await supabase
    .from("reviews")
    .upsert(
      { trainer_id: trainerId, student_id: studentId, rating, comment },
      { onConflict: "trainer_id,student_id" }
    );
  if (error) throw error;
}

export async function deleteMyReview(reviewId) {
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) throw error;
}
