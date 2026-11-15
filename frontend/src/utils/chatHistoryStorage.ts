import type { ChatConversationRecord } from "../types/chat";

export const CHAT_HISTORY_STORAGE_KEY = "smartcollege_ai_chat_history_v1";
export const STUDENT_SESSION_STORAGE_KEY = "smartcollege_student_session_id";
const MAX_STORED_CONVERSATIONS = 100;
const MAX_TITLE_LENGTH = 56;

/** Return or create a persistent anonymous session ID for feedback deduplication */
export function getOrCreateSessionId(): string {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      let sid = window.localStorage.getItem(STUDENT_SESSION_STORAGE_KEY);
      if (!sid) {
        sid =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        window.localStorage.setItem(STUDENT_SESSION_STORAGE_KEY, sid);
      }
      return sid;
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return `session-${Date.now()}`;
}

/** Generate a concise readable conversation title from the first student question. */
export function generateConversationTitle(question: string): string {
  const normalized = question.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Student Query";
  }
  if (normalized.length <= MAX_TITLE_LENGTH) {
    return normalized;
  }
  const truncated = normalized.slice(0, MAX_TITLE_LENGTH - 3);
  const lastSpace = truncated.lastIndexOf(" ");
  const cleanCut = lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated;
  return `${cleanCut.trimEnd()}...`;
}

function isValidConversationRecord(item: unknown): item is ChatConversationRecord {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<ChatConversationRecord>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.title === "string" &&
    (typeof candidate.collegeId === "string" || candidate.collegeId === null) &&
    (typeof candidate.collegeName === "string" || candidate.collegeName === null) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.messages)
  );
}

function sortByNewest(records: ChatConversationRecord[]): ChatConversationRecord[] {
  return [...records].sort((a, b) => {
    const timeDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    if (!Number.isNaN(timeDiff) && timeDiff !== 0) {
      return timeDiff;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function loadChatHistory(): ChatConversationRecord[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }
    const raw = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return sortByNewest(parsed.filter(isValidConversationRecord));
  } catch {
    return [];
  }
}

export function saveChatHistory(records: ChatConversationRecord[]): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    const bounded = sortByNewest(records).slice(0, MAX_STORED_CONVERSATIONS);
    window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(bounded));
  } catch {
    // Ignore storage quota or private-browsing write errors gracefully.
  }
}

export function upsertConversationInStorage(
  record: ChatConversationRecord,
): ChatConversationRecord[] {
  const existing = loadChatHistory().filter((item) => item.id !== record.id);
  const updated = sortByNewest([record, ...existing]).slice(
    0,
    MAX_STORED_CONVERSATIONS,
  );
  saveChatHistory(updated);
  return updated;
}

export function deleteConversationFromStorage(
  conversationId: string,
): ChatConversationRecord[] {
  const remaining = loadChatHistory().filter((item) => item.id !== conversationId);
  saveChatHistory(remaining);
  return remaining;
}

export function clearAllChatHistoryInStorage(): ChatConversationRecord[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors gracefully.
  }
  return [];
}

