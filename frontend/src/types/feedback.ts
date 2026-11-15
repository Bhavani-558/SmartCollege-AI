/**
 * Feedback TypeScript interfaces for student answer feedback and admin feedback management.
 */

export type FeedbackRating = "thumbs_up" | "thumbs_down";

export type FeedbackReason =
  | "Incorrect answer"
  | "Outdated information"
  | "Irrelevant answer"
  | "Incomplete answer"
  | "Other";

export type FeedbackStatus = "NEW" | "REVIEWED" | "RESOLVED" | "DISMISSED";

export interface FeedbackRecord {
  feedback_id: string;
  session_id: string;
  message_id: string;
  college_id: string;
  college_name: string;
  question: string;
  answer: string;
  intent?: string | null;
  rating: FeedbackRating;
  reason?: FeedbackReason | string | null;
  comment?: string | null;
  created_at: string;
  updated_at: string;
  status: FeedbackStatus;
  admin_notes?: string | null;
}

export interface FeedbackSubmitPayload {
  session_id: string;
  message_id: string;
  college_id: string;
  college_name?: string | null;
  question: string;
  answer: string;
  intent?: string | null;
  rating: FeedbackRating;
  reason?: FeedbackReason | string | null;
  comment?: string | null;
}

export interface FeedbackSubmitResponse {
  success: boolean;
  message: string;
  feedback: FeedbackRecord;
  is_updated: boolean;
}

export interface AdminFeedbackStats {
  total_count: number;
  positive_count: number;
  negative_count: number;
  positive_percentage: number;
  by_college: Record<string, number>;
  by_reason: Record<string, number>;
  by_status: Record<string, number>;
}

export interface AdminFeedbackFilterParams {
  college_id?: string;
  rating?: string;
  status?: string;
  reason?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminFeedbackListResponse {
  total_records: number;
  page: number;
  limit: number;
  total_pages: number;
  feedback: FeedbackRecord[];
}

export interface AdminFeedbackUpdatePayload {
  status?: FeedbackStatus;
  admin_notes?: string;
}
