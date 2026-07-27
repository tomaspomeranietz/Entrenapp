export function formatCurrency(amount, currency = "ARS") {
  if (amount === null || amount === undefined || amount === "") return "A consultar";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "recién";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `hace ${diffD} d`;
  return date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: diffD > 365 ? "numeric" : undefined,
  });
}

export function formatTimeRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = capitalize(start.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" }));
  const startTime = start.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${startTime} a ${endTime}`;
}

export function formatMessageTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function truncate(text, max = 140) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

export function capitalize(str = "") {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function initials(name = "") {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

const MODALITY_LABELS = { presencial: "Presencial", online: "Online", ambos: "Presencial y online" };
export function modalityLabel(modality) {
  return MODALITY_LABELS[modality] || "";
}

const LEVEL_LABELS = { principiante: "Principiante", intermedio: "Intermedio", avanzado: "Avanzado" };
export function levelLabel(level) {
  return LEVEL_LABELS[level] || "";
}
