import "../components/site-header.js";
import { requireAuth } from "../guard.js";
import {
  listMyConversations,
  getOrCreateConversation,
  listMessages,
  sendMessage,
  subscribeToConversation,
} from "../data/messages.js";
import { blockUser, unblockUser, isBlockedEitherWay, reportContent } from "../data/moderation.js";
import { $, escapeHtml } from "../utils/dom.js";
import { initials, formatMessageTime, formatRelativeTime } from "../utils/format.js";
import { showError, showSuccess } from "../utils/toast.js";
import { openModal, closeModal } from "../utils/modal.js";

let unsubscribe = null;
let activeConversationId = null;
let userId = null;

main();

async function main() {
  const auth = await requireAuth();
  if (!auth) return;
  userId = auth.profile.id;

  const conversations = await listMyConversations(userId).catch(() => []);
  renderConversationList(conversations);

  const withTrainerId = new URLSearchParams(location.search).get("with");
  if (withTrainerId && auth.profile.role === "alumno") {
    try {
      const created = await getOrCreateConversation(withTrainerId, userId);
      const refreshed = await listMyConversations(userId).catch(() => conversations);
      const conv = refreshed.find((c) => c.id === created.id) || created;
      openThread(conv, refreshed);
    } catch (err) {
      console.error(err);
      showError("No pudimos abrir esa conversación.");
    }
  }

  $("#chat-back").addEventListener("click", () => {
    $("#chat-layout").dataset.view = "list";
  });

  $("#composer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#composer-input");
    const body = input.value.trim();
    if (!body || !activeConversationId) return;
    input.value = "";
    try {
      await sendMessage(activeConversationId, userId, body);
    } catch (err) {
      console.error(err);
      showError("No pudimos enviar el mensaje.");
    }
  });
}

function otherParticipant(conv) {
  return conv.student_id === userId ? conv.trainer : conv.student;
}

function renderConversationList(conversations, activeId = activeConversationId) {
  const list = $("#conversation-list");
  if (!conversations.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-state__emoji">💬</span><p>Todavía no tenés conversaciones.</p></div>`;
    return;
  }

  list.innerHTML = conversations
    .map((c) => {
      const other = otherParticipant(c);
      const avatarInner = other?.avatar_url
        ? `<img src="${escapeHtml(other.avatar_url)}" alt="">`
        : escapeHtml(initials(other?.full_name));
      return `
        <button class="conversation-item${c.id === activeId ? " is-active" : ""}" data-conv-id="${c.id}" type="button">
          <span class="avatar">${avatarInner}</span>
          <span class="conversation-item__main">
            <span class="conversation-item__name">${escapeHtml(other?.full_name || "Usuario")}</span>
            <span class="text-faint" style="font-size:.75rem; display:block;">${formatRelativeTime(c.last_message_at)}</span>
          </span>
        </button>
      `;
    })
    .join("");

  list.querySelectorAll("[data-conv-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const conv = conversations.find((c) => c.id === btn.dataset.convId);
      openThread(conv, conversations);
    });
  });
}

async function openThread(conv, conversations) {
  activeConversationId = conv.id;
  $("#chat-layout").dataset.view = "thread";
  renderConversationList(conversations, conv.id);

  const other = otherParticipant(conv);
  $("#thread-header").textContent = other?.full_name || "Conversación";

  const messagesEl = $("#thread-messages");
  messagesEl.innerHTML = `<div class="skeleton" style="height:40px;"></div>`;

  const messages = await listMessages(conv.id).catch(() => []);
  renderMessages(messages);

  if (other?.id) await setupThreadActions(other);
  else $("#thread-actions").hidden = true;

  if (unsubscribe) unsubscribe();
  unsubscribe = subscribeToConversation(conv.id, (msg) => appendMessage(msg));
}

async function setupThreadActions(other) {
  const actions = $("#thread-actions");
  actions.hidden = false;

  let blockInfo;
  try {
    blockInfo = await isBlockedEitherWay(userId, other.id);
  } catch (err) {
    console.error(err);
    blockInfo = { blocked: false, blockedByMe: false };
  }
  $("#composer").hidden = blockInfo.blocked;

  const blockBtn = $("#block-user-btn");
  blockBtn.textContent = blockInfo.blockedByMe ? "Desbloquear" : "Bloquear";
  blockBtn.onclick = async () => {
    try {
      if (blockInfo.blockedByMe) {
        await unblockUser(userId, other.id);
        showSuccess(`Desbloqueaste a ${other.full_name}.`);
      } else {
        if (!confirm(`¿Bloquear a ${other.full_name}? No te va a poder volver a escribir.`)) return;
        await blockUser(userId, other.id);
        showSuccess(`Bloqueaste a ${other.full_name}.`);
      }
      const refreshed = await listMyConversations(userId).catch(() => []);
      const conv = refreshed.find((c) => c.id === activeConversationId);
      if (conv) openThread(conv, refreshed);
    } catch (err) {
      console.error(err);
      showError("No pudimos actualizar el bloqueo.");
    }
  };

  $("#report-user-btn").onclick = () => openReportModal(other);
}

function openReportModal(other) {
  openModal(
    `Reportar a ${other.full_name}`,
    `
    <form id="report-form">
      <div class="field">
        <label for="report-reason">Contanos qué pasó</label>
        <textarea class="textarea" id="report-reason" name="reason" required maxlength="500" placeholder="Describí el problema…"></textarea>
      </div>
      <button class="btn btn--primary" type="submit">Enviar reporte</button>
    </form>
  `
  );
  $("#report-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const reason = $("#report-reason").value.trim();
    if (!reason) return;
    btn.disabled = true;
    try {
      await reportContent(userId, "user", other.id, reason);
      showSuccess("Reporte enviado. Gracias por avisar.");
      closeModal();
    } catch (err) {
      console.error(err);
      showError("No pudimos enviar el reporte.");
      btn.disabled = false;
    }
  });
}

function renderMessages(messages) {
  const messagesEl = $("#thread-messages");
  if (!messages.length) {
    messagesEl.innerHTML = `<p class="text-secondary" style="margin:auto;">Todavía no hay mensajes. Escribí el primero.</p>`;
    return;
  }
  messagesEl.innerHTML = messages.map(messageHtml).join("");
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage(msg) {
  const messagesEl = $("#thread-messages");
  if (messagesEl.querySelector(".text-secondary")) messagesEl.innerHTML = "";
  messagesEl.insertAdjacentHTML("beforeend", messageHtml(msg));
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function messageHtml(msg) {
  const own = msg.sender_id === userId;
  return `
    <div class="msg${own ? " msg--own" : ""}">
      ${escapeHtml(msg.body)}
      <span class="msg__time">${formatMessageTime(msg.created_at)}</span>
    </div>
  `;
}
