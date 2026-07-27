import { supabase } from "../supabaseClient.js";

export async function listActivePricing(trainerId) {
  const { data, error } = await supabase
    .from("pricing_items")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listMyPricing(trainerId) {
  const { data, error } = await supabase
    .from("pricing_items")
    .select("*")
    .eq("trainer_id", trainerId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createPricingItem(trainerId, fields) {
  const { error } = await supabase.from("pricing_items").insert({ trainer_id: trainerId, ...fields });
  if (error) throw error;
}

export async function updatePricingItem(itemId, fields) {
  const { error } = await supabase.from("pricing_items").update(fields).eq("id", itemId);
  if (error) throw error;
}

export async function deletePricingItem(itemId) {
  const { error } = await supabase.from("pricing_items").delete().eq("id", itemId);
  if (error) throw error;
}
