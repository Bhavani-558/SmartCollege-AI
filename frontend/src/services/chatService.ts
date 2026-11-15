import type { ChatRequest, ChatResponse } from "../types/api";
import { apiClient, normalizeApiError } from "./api";

export const chatService = {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await apiClient.post<ChatResponse>("/api/chat", request);
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};

