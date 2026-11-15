import type { CollegeSummary, FAQVerificationStatus } from "./api";

export interface AdminUser {
  username: string;
  role: string;
}

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  username: string;
}

export interface AdminOverviewStats {
  total_colleges: number;
  total_faqs: number;
  verified_faqs: number;
  pending_faqs: number;
  total_queries: number;
  colleges: CollegeSummary[];
}

export interface AdminFAQItem {
  id: number | string;
  college_id: string;
  college_name: string;
  category: string;
  question: string;
  answer: string;
  source: string;
  last_verified: string;
  verification_status: FAQVerificationStatus;
}

export interface AdminFAQListResponse {
  total_records: number;
  verified_count: number;
  pending_count: number;
  faqs: AdminFAQItem[];
}

export interface AdminFAQCreatePayload {
  college_id: string;
  category: string;
  question: string;
  answer: string;
  source: string;
  verification_status?: FAQVerificationStatus;
}

export interface AdminFAQUpdatePayload {
  question?: string;
  answer?: string;
  category?: string;
  source?: string;
  verification_status?: FAQVerificationStatus;
}

export interface AdminCollegeCreatePayload {
  college_id: string;
  college_name: string;
  official_name?: string | null;
  short_code: string;
  location?: string | null;
  logo_url?: string | null;
  ugc_status?: string | null;
  is_primary_profile?: boolean;
  profile_status?: string;
  official_sources?: string[];
  supported_categories?: string[];
}

export interface AdminCollegeUpdatePayload {
  college_name?: string;
  official_name?: string | null;
  short_code?: string;
  location?: string | null;
  logo_url?: string | null;
  ugc_status?: string | null;
  is_primary_profile?: boolean;
  profile_status?: string;
  official_sources?: string[];
  supported_categories?: string[];
}

