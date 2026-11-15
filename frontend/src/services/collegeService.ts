import type {
  CollegeDetailResponse,
  CollegeFAQListResponse,
  CollegeListResponse,
  CollegeSelectRequest,
  CollegeSelectResponse,
  FAQVerificationStatus,
  HealthResponse,
} from "../types/api";
import { apiClient, normalizeApiError } from "./api";

export const collegeService = {
  async getHealth(): Promise<HealthResponse> {
    try {
      const response = await apiClient.get<HealthResponse>("/health");
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async listColleges(): Promise<CollegeListResponse> {
    try {
      const response = await apiClient.get<CollegeListResponse>("/api/colleges");
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async selectCollege(
    collegeId: string,
    previousCollegeId?: string | null,
  ): Promise<CollegeSelectResponse> {
    try {
      const payload: CollegeSelectRequest = {
        college_id: collegeId,
        previous_college_id: previousCollegeId ?? null,
      };
      const response = await apiClient.post<CollegeSelectResponse>(
        "/api/colleges/select",
        payload,
      );
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getCollegeDetail(collegeId: string): Promise<CollegeDetailResponse> {
    try {
      const response = await apiClient.get<CollegeDetailResponse>(
        `/api/colleges/${encodeURIComponent(collegeId)}`,
      );
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getCollegeFaqs(
    collegeId: string,
    options?: {
      category?: string;
      verificationStatus?: FAQVerificationStatus;
    },
  ): Promise<CollegeFAQListResponse> {
    try {
      const params: Record<string, string> = {};
      if (options?.category) params.category = options.category;
      if (options?.verificationStatus) {
        params.verification_status = options.verificationStatus;
      }
      const response = await apiClient.get<CollegeFAQListResponse>(
        `/api/colleges/${encodeURIComponent(collegeId)}/faqs`,
        { params },
      );
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};

