import { supabase } from "../supabaseClient.js";

// "!reviews_student_id_fkey" desambigua: reviews tiene dos relaciones con
// profiles (trainer_id y student_id), PostgREST necesita saber cuál usar.
export async function listReviewsForTrainer(trainerId) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, student:profiles!reviews_student_id_fkey(full_name, avatar_url), review_replies(*)")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
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
