import { supabase } from "../supabaseClient.js";

export async function listUpcomingAvailability(trainerId) {
  const { data, error } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("is_available", true)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listMyAvailability(trainerId) {
  const { data, error } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("trainer_id", trainerId)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createSlot(trainerId, fields) {
  const { error } = await supabase.from("availability_slots").insert({ trainer_id: trainerId, ...fields });
  if (error) throw error;
}

export async function updateSlot(slotId, fields) {
  const { error } = await supabase.from("availability_slots").update(fields).eq("id", slotId);
  if (error) throw error;
}

export async function toggleSlotAvailability(slotId, isAvailable) {
  const { error } = await supabase
    .from("availability_slots")
    .update({ is_available: isAvailable })
    .eq("id", slotId);
  if (error) throw error;
}

export async function deleteSlot(slotId) {
  const { error } = await supabase.from("availability_slots").delete().eq("id", slotId);
  if (error) throw error;
}
