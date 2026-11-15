import { AxiosError, AxiosHeaders } from "axios";
import { ApiServiceError, normalizeApiError } from "../services/api";
import {
  cleanVerifiedAnswerText,
  formatCategoryLabel,
  formatConfidencePercent,
  formatSourceLabel,
  isHttpUrl,
  splitTextWithLinks,
} from "../utils/formatters";

describe("Frontend utilities and API error normalization", () => {
  it("formats category labels, confidence percentages, source labels, and deduplicates verified URLs cleanly", () => {
    expect(formatCategoryLabel("college_location")).toBe("College Location");
    expect(formatCategoryLabel("department_hod")).toBe("Department HOD");
    expect(formatConfidencePercent(0.914)).toBe("91%");
    expect(isHttpUrl("https://nriuniversity.in/")).toBe(true);
    expect(isHttpUrl("PENDING_VERIFICATION")).toBe(false);

    expect(formatSourceLabel("https://rvrnriuniversity.edu.in/admissions/")).toBe(
      "Official Admissions Portal",
    );
    expect(formatSourceLabel("https://rvrnriuniversity.edu.in/contact-us/")).toBe(
      "Official Contact Page",
    );
    expect(formatSourceLabel("https://nriuniversity.in/")).toBe(
      "Official University Website",
    );

    expect(
      cleanVerifiedAnswerText(
        "Students can apply online on the official admissions portal at https://rvrnriuniversity.edu.in/admissions/.",
        "https://rvrnriuniversity.edu.in/admissions/",
      ),
    ).toBe("Students can apply online on the official admissions portal.");

    expect(
      cleanVerifiedAnswerText(
        "The official websites for NRI University are https://nriuniversity.in/ and https://rvrnriuniversity.edu.in/.",
        "https://nriuniversity.in/",
      ),
    ).toBe("The official websites for NRI University are https://rvrnriuniversity.edu.in/.");

    // Distinct non-duplicate URLs in answers (e.g., prospectus PDF on admissions page) must remain intact.
    expect(
      cleanVerifiedAnswerText(
        "Download the prospectus PDF at https://rvrnriuniversity.edu.in/wp-content/uploads/2026/03/NRIU-Prospectus.pdf.",
        "https://rvrnriuniversity.edu.in/admissions/",
      ),
    ).toBe(
      "Download the prospectus PDF at https://rvrnriuniversity.edu.in/wp-content/uploads/2026/03/NRIU-Prospectus.pdf.",
    );

    const segments = splitTextWithLinks(
      "Visit https://rvrnriuniversity.edu.in/admissions/ or email info@rvrnriuniversity.edu.in.",
    );
    expect(segments.some((s) => s.type === "link" && s.value === "https://rvrnriuniversity.edu.in/admissions/")).toBe(true);
    expect(segments.some((s) => s.type === "email" && s.value === "info@rvrnriuniversity.edu.in")).toBe(true);
  });

  it("normalizes FastAPI ErrorResponse and network errors without crashing", () => {
    const fastapiErr = new AxiosError(
      "Bad Request",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {
          detail: "A valid college_id is required.",
          error_code: "MISSING_COLLEGE_ID",
          context: { predicted_intent: "fees" },
        },
      },
    );

    const normalized = normalizeApiError(fastapiErr);
    expect(normalized).toBeInstanceOf(ApiServiceError);
    expect(normalized.status).toBe(400);
    expect(normalized.errorCode).toBe("MISSING_COLLEGE_ID");
    expect(normalized.message).toBe("A valid college_id is required.");

    const offlineErr = normalizeApiError(new AxiosError("Network Error", "ERR_NETWORK"));
    expect(offlineErr.errorCode).toBe("NETWORK_ERROR");
    expect(offlineErr.message).toContain("Unable to reach the chatbot API");
  });
});

