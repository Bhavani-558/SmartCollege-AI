import type {
  CandidateIntent,
  ChatResponseType,
  ChatVerificationStatus,
  FAQItem,
} from "./api";

export type MessageRole = "student" | "assistant" | "system";

export interface MessageMetadata {
  intent?: string;
  candidateIntent?: string | null;
  confidence?: number;
  collegeSpecific?: boolean;
  responseType?: ChatResponseType;
  verificationStatus?: ChatVerificationStatus;
  matchedQuestion?: string | null;
  source?: string | null;
  lastVerified?: string | null;
  relatedVerifiedFaqs?: FAQItem[];
  topCandidates?: CandidateIntent[];
  isError?: boolean;
  errorCode?: string;
}

export interface MessageFeedback {
  rating: "thumbs_up" | "thumbs_down";
  reason?: string;
  comment?: string;
  submittedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  collegeId: string | null;
  collegeName: string | null;
  meta?: MessageMetadata;
  feedback?: MessageFeedback;
}

export interface ChatConversationRecord {
  id: string;
  title: string;
  collegeId: string | null;
  collegeName: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface SuggestedQuestionItem {
  id: string;
  label: string;
  question: string;
  category: string;
  requiresCollege: boolean;
}

