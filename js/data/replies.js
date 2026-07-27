import { supabase } from "../supabaseClient.js";

// Upsert apoyado en el UNIQUE(review_id): el preparador solo tiene una
// respuesta por reseña, y puede editarla llamando esto de nuevo.
export async function upsertReply(reviewId, trainerId, body) {
  const { error } = await supabase
    .from("review_replies")
    .upsert({ review_id: reviewId, trainer_id: trainerId, body }, { onConflict: "review_id" });
  if (error) throw error;
}

export async function deleteReply(replyId) {
  const { error } = await supabase.from("review_replies").delete().eq("id", replyId);
  if (error) throw error;
}
