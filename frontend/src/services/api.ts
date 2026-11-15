import axios, { AxiosError } from "axios";
import type { ErrorResponse } from "../types/api";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://127.0.0.1:8000";

export class ApiServiceError extends Error {
  public readonly status: number;
  public readonly errorCode: string;
  public readonly context?: Record<string, unknown> | null;

  constructor(
    message: string,
    status = 0,
    errorCode = "API_ERROR",
    context?: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = "ApiServiceError";
    this.status = status;
    this.errorCode = errorCode;
    this.context = context;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export function normalizeApiError(error: unknown): ApiServiceError {
  if (error instanceof ApiServiceError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<Partial<ErrorResponse>>;
    const status = axiosError.response?.status ?? 0;
    const payload = axiosError.response?.data;

    if (payload && typeof payload.detail === "string") {
      return new ApiServiceError(
        payload.detail,
        status,
        typeof payload.error_code === "string" ? payload.error_code : "HTTP_ERROR",
        payload.context ?? null,
      );
    }

    if (axiosError.code === "ECONNABORTED") {
      return new ApiServiceError(
        "The server took too long to respond. Please try again.",
        status,
        "TIMEOUT_ERROR",
      );
    }

    if (!axiosError.response) {
      return new ApiServiceError(
        `Unable to reach the chatbot API at ${API_BASE_URL}. Please ensure the FastAPI backend is running.`,
        0,
        "NETWORK_ERROR",
      );
    }

    return new ApiServiceError(
      axiosError.message || "Unexpected API request failure.",
      status,
      "HTTP_ERROR",
    );
  }

  if (error instanceof Error) {
    return new ApiServiceError(error.message, 0, "UNEXPECTED_ERROR");
  }

  return new ApiServiceError(
    "An unexpected error occurred while contacting the server.",
    0,
    "UNKNOWN_ERROR",
  );
}

