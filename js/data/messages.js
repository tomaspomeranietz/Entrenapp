import { supabase } from "../supabaseClient.js";

// otherId/myId en vez de trainerId/studentId: desde que un preparador
// también puede iniciar una conversación con otro preparador, "quién iba
// en qué columna" ya no lo define el rol. Se busca en los dos sentidos
// posibles para no crear un hilo duplicado según quién escribe primero
// (si ya existe {student_id:B, trainer_id:A} y ahora A le escribe a B,
// tiene que encontrar ESE hilo, no crear uno nuevo al revés).
export async function getOrCreateConversation(otherId, myId) {
  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("*")
    .or(`and(student_id.eq.${myId},trainer_id.eq.${otherId}),and(student_id.eq.${otherId},trainer_id.eq.${myId})`)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ student_id: myId, trainer_id: otherId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Igual que en reviews.js: el nombre/avatar del otro participante se busca
// aparte contra la vista pública profile_identities, porque desde sql/006
// un perfil de alumno ya no se puede leer completo salvo que seas vos mismo.
export async function listMyConversations(userId) {
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`student_id.eq.${userId},trainer_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  if (!conversations.length) return conversations;

  const peopleIds = [...new Set(conversations.flatMap((c) => [c.student_id, c.trainer_id]))];
  const { data: people } = await supabase.from("profile_identities").select("id, full_name, avatar_url").in("id", peopleIds);
  const byId = new Map((people || []).map((p) => [p.id, p]));

  return conversations.map((c) => ({
    ...c,
    student: byId.get(c.student_id) || null,
    trainer: byId.get(c.trainer_id) || null,
  }));
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
