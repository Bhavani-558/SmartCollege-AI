import { apiClient, normalizeApiError } from "./api";
import type { FeedbackSubmitPayload, FeedbackSubmitResponse } from "../types/feedback";

export const feedbackService = {
  /**
   * Submit or update student feedback for a chatbot answer.
   */
  async submitFeedback(payload: FeedbackSubmitPayload): Promise<FeedbackSubmitResponse> {
    try {
      const response = await apiClient.post<FeedbackSubmitResponse>("/api/feedback", payload);
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};

