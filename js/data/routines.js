import { supabase } from "../supabaseClient.js";

export async function listPublishedRoutines(trainerId) {
  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listMyRoutines(trainerId) {
  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createRoutine(trainerId, fields) {
  const { error } = await supabase.from("routines").insert({ trainer_id: trainerId, ...fields });
  if (error) throw error;
}

export async function updateRoutine(routineId, fields) {
  const { error } = await supabase.from("routines").update(fields).eq("id", routineId);
  if (error) throw error;
}

export async function deleteRoutine(routineId) {
  const { error } = await supabase.from("routines").delete().eq("id", routineId);
  if (error) throw error;
}
