import { supabase } from "../supabaseClient.js";

export async function followTrainer(followerId, followedId) {
  const { error } = await supabase.from("follows").insert({ follower_id: followerId, followed_id: followedId });
  if (error) throw error;
}

export async function unfollowTrainer(followerId, followedId) {
  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("followed_id", followedId);
  if (error) throw error;
}

export async function isFollowing(followerId, followedId) {
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("followed_id", followedId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
