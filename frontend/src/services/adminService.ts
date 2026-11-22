import { apiClient, normalizeApiError } from "./api";
import type {
  AdminCollegeCreatePayload,
  AdminCollegeUpdatePayload,
  AdminFAQCreatePayload,
  AdminFAQItem,
  AdminFAQListResponse,
  AdminFAQUpdatePayload,
  AdminLoginResponse,
  AdminOverviewStats,
  AdminUser,
} from "../types/admin";
import type { CollegeDetailResponse, CollegeListResponse } from "../types/api";
import type {
  AdminFeedbackFilterParams,
  AdminFeedbackListResponse,
  AdminFeedbackStats,
  AdminFeedbackUpdatePayload,
  FeedbackRecord,
} from "../types/feedback";

export const ADMIN_TOKEN_KEY = "smartcollege_admin_access_token";

export function getStoredAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // Ignore storage quota or security errors
  }
}

export function removeStoredAdminToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

function getAuthHeaders(): Record<string, string> {
  return {};
}

export const adminService = {
  // Authentication Endpoints
  async login(credentials: { username: string; password: string }): Promise<AdminLoginResponse> {
    try {
      removeStoredAdminToken();

      const response = await apiClient.post<AdminLoginResponse>(
        "/api/admin/auth/login",
        credentials
      );

      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/api/admin/auth/logout", {});
    } catch {
      // Continue local cleanup even if the server request fails.
    } finally {
      removeStoredAdminToken();
    }
  },

  async getMe(): Promise<AdminUser> {
    try {
      const response = await apiClient.get<AdminUser>("/api/admin/auth/me", {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  // Overview Stats
  async getOverviewStats(): Promise<AdminOverviewStats> {
    try {
      const response = await apiClient.get<AdminOverviewStats>("/api/admin/stats", {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  // FAQ Management
  async listFAQs(params?: {
    college_id?: string;
    category?: string;
    verification_status?: string;
    search?: string;
  }): Promise<AdminFAQListResponse> {
    try {
      const response = await apiClient.get<AdminFAQListResponse>("/api/admin/faqs", {
        headers: getAuthHeaders(),
        params,
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getFAQ(faqId: number | string): Promise<AdminFAQItem> {
    try {
      const response = await apiClient.get<AdminFAQItem>(`/api/admin/faqs/${faqId}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async createFAQ(payload: AdminFAQCreatePayload): Promise<AdminFAQItem> {
    try {
      const response = await apiClient.post<AdminFAQItem>("/api/admin/faqs", payload, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateFAQ(faqId: number | string, payload: AdminFAQUpdatePayload): Promise<AdminFAQItem> {
    try {
      const response = await apiClient.put<AdminFAQItem>(
        `/api/admin/faqs/${faqId}`,
        payload,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateFAQVerification(
    faqId: number | string,
    verificationStatus: "VERIFIED" | "PENDING_VERIFICATION"
  ): Promise<AdminFAQItem> {
    try {
      const response = await apiClient.patch<AdminFAQItem>(
        `/api/admin/faqs/${faqId}/verification`,
        { verification_status: verificationStatus },
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async deleteFAQ(faqId: number | string): Promise<{ message: string; faq_id: number | string }> {
    try {
      const response = await apiClient.delete<{ message: string; faq_id: number | string }>(
        `/api/admin/faqs/${faqId}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  // College Management
  async listColleges(): Promise<CollegeListResponse> {
    try {
      const response = await apiClient.get<CollegeListResponse>("/api/admin/colleges", {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getCollege(collegeId: string): Promise<CollegeDetailResponse> {
    try {
      const response = await apiClient.get<CollegeDetailResponse>(
        `/api/admin/colleges/${collegeId}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async createCollege(payload: AdminCollegeCreatePayload): Promise<CollegeDetailResponse> {
    try {
      const response = await apiClient.post<CollegeDetailResponse>(
        "/api/admin/colleges",
        payload,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateCollege(
    collegeId: string,
    payload: AdminCollegeUpdatePayload
  ): Promise<CollegeDetailResponse> {
    try {
      const response = await apiClient.put<CollegeDetailResponse>(
        `/api/admin/colleges/${collegeId}`,
        payload,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async deleteCollege(
    collegeId: string
  ): Promise<{ message: string; deleted_college_id: string; success: boolean }> {
    try {
      const response = await apiClient.delete<{
        message: string;
        deleted_college_id: string;
        success: boolean;
      }>(`/api/admin/colleges/${collegeId}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getFeedbackStats(collegeId?: string): Promise<AdminFeedbackStats> {
    try {
      const params = collegeId && collegeId !== "ALL" ? { college_id: collegeId } : {};
      const response = await apiClient.get<AdminFeedbackStats>("/api/admin/feedback/stats", {
        headers: getAuthHeaders(),
        params,
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async listFeedback(params?: AdminFeedbackFilterParams): Promise<AdminFeedbackListResponse> {
    try {
      const cleanParams: Record<string, unknown> = {};
      if (params) {
        if (params.college_id && params.college_id !== "ALL") cleanParams.college_id = params.college_id;
        if (params.rating && params.rating !== "ALL") cleanParams.rating = params.rating;
        if (params.status && params.status !== "ALL") cleanParams.status = params.status;
        if (params.reason && params.reason !== "ALL") cleanParams.reason = params.reason;
        if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
        if (params.page) cleanParams.page = params.page;
        if (params.limit) cleanParams.limit = params.limit;
      }
      const response = await apiClient.get<AdminFeedbackListResponse>("/api/admin/feedback", {
        headers: getAuthHeaders(),
        params: cleanParams,
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateFeedback(
    feedbackId: string,
    payload: AdminFeedbackUpdatePayload
  ): Promise<FeedbackRecord> {
    try {
      const response = await apiClient.patch<FeedbackRecord>(
        `/api/admin/feedback/${feedbackId}`,
        payload,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};

