/** Exact TypeScript interfaces matching backend/app/utils/schemas.py */

export interface ErrorResponse {
  detail: string;
  error_code: string;
  context?: Record<string, unknown> | null;
}

export interface CollegeSummary {
  college_id: string;
  college_name: string;
  official_name?: string | null;
  short_code: string;
  location?: string | null;
  logo_url?: string | null;
  is_primary_profile: boolean;
  profile_status: string;
  verified_faq_count: number;
  pending_faq_count: number;
  last_verified: string;
}

export interface CollegeListResponse {
  total_colleges: number;
  colleges: CollegeSummary[];
}

export interface CollegeDetailResponse {
  college_id: string;
  college_name: string;
  official_name?: string | null;
  short_code: string;
  location?: string | null;
  logo_url?: string | null;
  ugc_status?: string | null;
  is_primary_profile: boolean;
  profile_status: string;
  official_sources: string[];
  supported_categories: string[];
  verified_fields: Record<string, unknown>;
  institutional_data: Record<string, unknown>;
  last_verified: string;
}

export interface CollegeSelectRequest {
  college_id: string;
  previous_college_id?: string | null;
}

export interface CollegeSelectResponse {
  selected_college: CollegeSummary;
  previous_college_id?: string | null;
  context_reset: boolean;
  supported_categories: string[];
  message: string;
}

export type FAQVerificationStatus = "VERIFIED" | "PENDING_VERIFICATION";

export interface FAQItem {
  college_id: string;
  college_name: string;
  category: string;
  question: string;
  answer: string;
  source: string;
  last_verified: string;
  verification_status: FAQVerificationStatus;
}

export interface CollegeFAQListResponse {
  college_id: string;
  college_name: string;
  total_records: number;
  verified_count: number;
  pending_count: number;
  faqs: FAQItem[];
}

export interface ChatRequest {
  question: string;
  college_id?: string | null;
  confidence_threshold?: number | null;
}

export interface CandidateIntent {
  intent: string;
  confidence: number;
}

export type ChatResponseType =
  | "general"
  | "verified_faq"
  | "pending_verification"
  | "unknown";

export type ChatVerificationStatus =
  | "GENERAL"
  | "VERIFIED"
  | "PENDING_VERIFICATION"
  | "NOT_APPLICABLE";

export interface ChatResponse {
  question: string;
  intent: string;
  candidate_intent?: string | null;
  confidence: number;
  is_unknown: boolean;
  college_specific: boolean;
  response_type: ChatResponseType;
  verification_status: ChatVerificationStatus;
  college_id?: string | null;
  college_name?: string | null;
  answer: string;
  matched_question?: string | null;
  source?: string | null;
  last_verified?: string | null;
  related_verified_faqs: FAQItem[];
  top_candidates: CandidateIntent[];
}

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  active_faq_backend: string;
  postgres_prepared: boolean;
  postgres_configured: boolean;
  intent_classifier_loaded: boolean;
  num_intents: number;
  confidence_threshold: number;
  total_colleges: number;
}

