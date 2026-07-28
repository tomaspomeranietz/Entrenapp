import { supabase } from "../supabaseClient.js";

export async function reportContent(reporterId, targetType, targetId, reason) {
  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason });
  if (error) throw error;
}

export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
  if (error) throw error;
}

// true si hay un bloqueo activo entre las dos personas, en cualquier sentido.
export async function isBlockedEitherWay(userId, otherId) {
  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${userId})`
    );
  if (error) throw error;
  return { blocked: (data || []).length > 0, blockedByMe: (data || []).some((b) => b.blocker_id === userId) };
}
