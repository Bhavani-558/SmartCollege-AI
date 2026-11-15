import { useCallback, useEffect, useRef, useState } from "react";
import { ApiServiceError, normalizeApiError } from "../services/api";
import { chatService } from "../services/chatService";
import type { ChatResponse, CollegeSummary } from "../types/api";
import type { ChatConversationRecord, ChatMessage, MessageFeedback } from "../types/chat";
import {
  clearAllChatHistoryInStorage,
  deleteConversationFromStorage,
  generateConversationTitle,
  loadChatHistory,
  upsertConversationInStorage,
} from "../utils/chatHistoryStorage";
import {
  PENDING_VERIFICATION_MESSAGE,
  UNKNOWN_QUERY_MESSAGE,
} from "../utils/constants";

function createMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createConversationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `conv-${crypto.randomUUID()}`;
  }
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildWelcomeMessage(
  college: CollegeSummary | null,
  switchNotice: string | null,
): ChatMessage {
  if (!college) {
    return {
      id: createMessageId(),
      role: "assistant",
      content:
        "Welcome to Your Smart College Assistant! You can ask general questions anytime, or select a college from the dropdown to explore verified campus information, courses, admissions, and contact details.",
      timestamp: new Date().toISOString(),
      collegeId: null,
      collegeName: null,
      meta: {
        responseType: "general",
        verificationStatus: "GENERAL",
      },
    };
  }

  const profileNotice =
    college.verified_faq_count > 0
      ? `${college.college_name} has ${college.verified_faq_count} verified FAQ records and ${college.pending_faq_count} records pending verification.`
      : `${college.college_name} is currently a template profile (${college.pending_faq_count} FAQ records are marked PENDING_VERIFICATION).`;

  const introPrefix = switchNotice ? `${switchNotice}\n\n` : "";

  return {
    id: createMessageId(),
    role: "assistant",
    content: `${introPrefix}Welcome to the ${college.college_name} Knowledge Base.\n\n${profileNotice}\n\nAsk questions about admissions, cutoffs, courses, fees, placements, scholarships, hostel, or contact details. All answers are scoped strictly to ${college.college_name}.`,
    timestamp: new Date().toISOString(),
    collegeId: college.college_id,
    collegeName: college.college_name,
    meta: {
      responseType: "general",
      verificationStatus: "GENERAL",
    },
  };
}

function mapChatResponseToContent(response: ChatResponse): string {
  if (response.response_type === "pending_verification") {
    return PENDING_VERIFICATION_MESSAGE;
  }
  if (response.response_type === "unknown" || response.is_unknown) {
    return UNKNOWN_QUERY_MESSAGE;
  }
  return response.answer;
}

export interface UseChatSessionResult {
  messages: ChatMessage[];
  conversations: ChatConversationRecord[];
  activeConversationId: string;
  isSending: boolean;
  chatError: ApiServiceError | null;
  sendQuestion: (rawQuestion: string) => Promise<void>;
  updateMessageFeedback: (messageId: string, feedback: MessageFeedback) => void;
  clearConversation: () => void;
  restoreConversation: (record: ChatConversationRecord) => Promise<boolean>;
  deleteConversation: (conversationId: string) => void;
  deleteAllHistory: () => void;
  dismissChatError: () => void;
}

interface ActiveConversationMeta {
  id: string;
  createdAt: string;
  title: string | null;
  collegeId: string | null;
  collegeName: string | null;
}

export function useChatSession(
  selectedCollege: CollegeSummary | null,
  contextVersion: number,
  lastSwitchNotice: string | null,
  onSwitchCollege?: (collegeId: string | null) => Promise<boolean>,
): UseChatSessionResult {
  const initialConversationIdRef = useRef<string>(createConversationId());
  const initialCreatedAtRef = useRef<string>(new Date().toISOString());

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildWelcomeMessage(selectedCollege, null),
  ]);
  const [conversations, setConversations] = useState<ChatConversationRecord[]>(() =>
    loadChatHistory(),
  );
  const [activeConversationId, setActiveConversationId] = useState<string>(
    initialConversationIdRef.current,
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [chatError, setChatError] = useState<ApiServiceError | null>(null);

  const selectedCollegeRef = useRef<CollegeSummary | null>(selectedCollege);
  selectedCollegeRef.current = selectedCollege;

  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const activeMetaRef = useRef<ActiveConversationMeta>({
    id: initialConversationIdRef.current,
    createdAt: initialCreatedAtRef.current,
    title: null,
    collegeId: selectedCollege?.college_id ?? null,
    collegeName: selectedCollege?.college_name ?? null,
  });

  const pendingRestoreRef = useRef<ChatConversationRecord | null>(null);
  const sessionTokenRef = useRef<number>(0);
  const isFirstContextMount = useRef<boolean>(true);

  const resetToFreshConversation = useCallback(
    (college: CollegeSummary | null, notice: string | null) => {
      const nextId = createConversationId();
      const now = new Date().toISOString();
      sessionTokenRef.current += 1;
      activeMetaRef.current = {
        id: nextId,
        createdAt: now,
        title: null,
        collegeId: college?.college_id ?? null,
        collegeName: college?.college_name ?? null,
      };
      setActiveConversationId(nextId);
      setChatError(null);
      setIsSending(false);
      const welcome = [buildWelcomeMessage(college, notice)];
      messagesRef.current = welcome;
      setMessages(welcome);
    },
    [],
  );

  // Reset college-specific conversation view whenever the active college changes,
  // unless the change was triggered to restore a saved conversation for that college.
  useEffect(() => {
    if (isFirstContextMount.current) {
      isFirstContextMount.current = false;
      return;
    }

    const pendingRestore = pendingRestoreRef.current;
    const currentCollegeId = selectedCollege?.college_id ?? null;
    if (pendingRestore && pendingRestore.collegeId === currentCollegeId) {
      pendingRestoreRef.current = null;
      sessionTokenRef.current += 1;
      activeMetaRef.current = {
        id: pendingRestore.id,
        createdAt: pendingRestore.createdAt,
        title: pendingRestore.title,
        collegeId: pendingRestore.collegeId,
        collegeName: pendingRestore.collegeName,
      };
      setActiveConversationId(pendingRestore.id);
      setChatError(null);
      setIsSending(false);
      messagesRef.current = pendingRestore.messages;
      setMessages(pendingRestore.messages);
      return;
    }

    pendingRestoreRef.current = null;
    resetToFreshConversation(selectedCollege, lastSwitchNotice);
  }, [contextVersion, selectedCollege, lastSwitchNotice, resetToFreshConversation]);

  const clearConversation = useCallback(() => {
    resetToFreshConversation(selectedCollegeRef.current, null);
  }, [resetToFreshConversation]);

  const restoreConversation = useCallback(
    async (record: ChatConversationRecord): Promise<boolean> => {
      const currentCollegeId = selectedCollegeRef.current?.college_id ?? null;

      if (record.collegeId === currentCollegeId) {
        sessionTokenRef.current += 1;
        activeMetaRef.current = {
          id: record.id,
          createdAt: record.createdAt,
          title: record.title,
          collegeId: record.collegeId,
          collegeName: record.collegeName,
        };
        setActiveConversationId(record.id);
        setChatError(null);
        setIsSending(false);
        messagesRef.current = record.messages;
        setMessages(record.messages);
        return true;
      }

      if (!onSwitchCollege) {
        return false;
      }

      pendingRestoreRef.current = record;
      const switched = await onSwitchCollege(record.collegeId);
      if (!switched) {
        pendingRestoreRef.current = null;
      }
      return switched;
    },
    [onSwitchCollege],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      const remaining = deleteConversationFromStorage(conversationId);
      setConversations(remaining);
      if (activeMetaRef.current.id === conversationId) {
        resetToFreshConversation(selectedCollegeRef.current, null);
      }
    },
    [resetToFreshConversation],
  );

  const deleteAllHistory = useCallback(() => {
    const empty = clearAllChatHistoryInStorage();
    setConversations(empty);
    resetToFreshConversation(selectedCollegeRef.current, null);
  }, [resetToFreshConversation]);

  const dismissChatError = useCallback(() => {
    setChatError(null);
  }, []);

  const persistSnapshot = useCallback(
    (
      nextMessages: ChatMessage[],
      collegeId: string | null,
      collegeName: string | null,
    ) => {
      const firstStudentMsg = nextMessages.find((msg) => msg.role === "student");
      if (!firstStudentMsg) {
        return;
      }

      const meta = activeMetaRef.current;
      const resolvedTitle =
        meta.title ?? generateConversationTitle(firstStudentMsg.content);
      meta.title = resolvedTitle;
      meta.collegeId = collegeId;
      meta.collegeName = collegeName;

      const record: ChatConversationRecord = {
        id: meta.id,
        title: resolvedTitle,
        collegeId,
        collegeName,
        createdAt: meta.createdAt,
        updatedAt: new Date().toISOString(),
        messages: nextMessages,
      };
      const updated = upsertConversationInStorage(record);
      setConversations(updated);
    },
    [],
  );

  const sendQuestion = useCallback(
    async (rawQuestion: string) => {
      const trimmed = rawQuestion.trim();
      if (!trimmed) {
        return;
      }

      const requestSessionToken = sessionTokenRef.current;
      const activeCollege = selectedCollegeRef.current;
      const targetCollegeId = activeCollege?.college_id ?? null;
      const targetCollegeName = activeCollege?.college_name ?? null;

      const studentMessage: ChatMessage = {
        id: createMessageId(),
        role: "student",
        content: trimmed,
        timestamp: new Date().toISOString(),
        collegeId: targetCollegeId,
        collegeName: targetCollegeName,
      };

      const nextWithStudent = [...messagesRef.current, studentMessage];
      messagesRef.current = nextWithStudent;
      setChatError(null);
      setMessages(nextWithStudent);
      persistSnapshot(nextWithStudent, targetCollegeId, targetCollegeName);
      setIsSending(true);

      try {
        const response = await chatService.sendMessage({
          question: trimmed,
          college_id: targetCollegeId,
        });

        if (requestSessionToken !== sessionTokenRef.current) {
          return;
        }

        const resolvedCollegeId = response.college_id ?? targetCollegeId;
        const resolvedCollegeName = response.college_name ?? targetCollegeName;
        const content = mapChatResponseToContent(response);

        const assistantMessage: ChatMessage = {
          id: createMessageId(),
          role: "assistant",
          content,
          timestamp: new Date().toISOString(),
          collegeId: resolvedCollegeId,
          collegeName: resolvedCollegeName,
          meta: {
            intent: response.intent,
            candidateIntent: response.candidate_intent,
            confidence: response.confidence,
            collegeSpecific: response.college_specific,
            responseType: response.response_type,
            verificationStatus: response.verification_status,
            matchedQuestion: response.matched_question,
            source: response.source,
            lastVerified: response.last_verified,
            relatedVerifiedFaqs: response.related_verified_faqs,
            topCandidates: response.top_candidates,
          },
        };

        const nextWithAssistant = [...messagesRef.current, assistantMessage];
        messagesRef.current = nextWithAssistant;
        setMessages(nextWithAssistant);
        persistSnapshot(nextWithAssistant, resolvedCollegeId, resolvedCollegeName);
      } catch (error) {
        if (requestSessionToken !== sessionTokenRef.current) {
          return;
        }

        const normalized = normalizeApiError(error);
        setChatError(normalized);

        const errorNotice =
          normalized.errorCode === "MISSING_COLLEGE_ID"
            ? "Please select a college from the dropdown before asking college-specific questions."
            : normalized.message;

        const assistantErrorMessage: ChatMessage = {
          id: createMessageId(),
          role: "assistant",
          content: errorNotice,
          timestamp: new Date().toISOString(),
          collegeId: targetCollegeId,
          collegeName: targetCollegeName,
          meta: {
            isError: true,
            errorCode: normalized.errorCode,
          },
        };

        const nextWithError = [...messagesRef.current, assistantErrorMessage];
        messagesRef.current = nextWithError;
        setMessages(nextWithError);
        persistSnapshot(nextWithError, targetCollegeId, targetCollegeName);
      } finally {
        if (requestSessionToken === sessionTokenRef.current) {
          setIsSending(false);
        }
      }
    },
    [persistSnapshot],
  );

  const updateMessageFeedback = useCallback(
    (messageId: string, feedback: MessageFeedback) => {
      setMessages((prev) => {
        const next = prev.map((msg) =>
          msg.id === messageId ? { ...msg, feedback } : msg,
        );
        messagesRef.current = next;
        const meta = activeMetaRef.current;
        persistSnapshot(next, meta.collegeId, meta.collegeName);
        return next;
      });
    },
    [persistSnapshot],
  );

  return {
    messages,
    conversations,
    activeConversationId,
    isSending,
    chatError,
    sendQuestion,
    updateMessageFeedback,
    clearConversation,
    restoreConversation,
    deleteConversation,
    deleteAllHistory,
    dismissChatError,
  };
}
