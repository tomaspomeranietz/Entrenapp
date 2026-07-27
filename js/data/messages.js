import { supabase } from "../supabaseClient.js";

export async function getOrCreateConversation(trainerId, studentId) {
  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("*")
    .eq("student_id", studentId)
    .eq("trainer_id", trainerId)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ student_id: studentId, trainer_id: trainerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listMyConversations(userId) {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `*,
      student:profiles!conversations_student_id_fkey(id, full_name, avatar_url),
      trainer:profiles!conversations_trainer_id_fkey(id, full_name, avatar_url)`
    )
    .or(`student_id.eq.${userId},trainer_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function sendMessage(conversationId, senderId, body) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body });
  if (error) throw error;
}

// Devuelve una función para desuscribirse; llamarla al salir de la página/hilo.
export function subscribeToConversation(conversationId, onNewMessage) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
