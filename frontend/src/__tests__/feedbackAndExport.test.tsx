import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ThemeProvider } from "@mui/material";
import { MessageBubble } from "../components/MessageBubble";
import { ChatWindow } from "../components/ChatWindow";
import { CollegeProvider } from "../contexts/CollegeContext";
import { AdminFeedbackManagement } from "../pages/admin/AdminFeedbackManagement";
import { adminService } from "../services/adminService";
import { feedbackService } from "../services/feedbackService";
import { ApiServiceError } from "../services/api";
import theme from "../theme/theme";
import type { ChatMessage } from "../types/chat";
import type {
  AdminFeedbackListResponse,
  AdminFeedbackStats,
  FeedbackRecord,
} from "../types/feedback";
import {
  exportConversationAsPdf,
  exportConversationAsTxt,
  formatFullConversation,
  formatSingleMessage,
} from "../utils/exportUtils";

// Mock jsPDF
vi.mock("jspdf", () => {
  const MockDoc = function () {
    return {
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      setFont: vi.fn(),
      setFillColor: vi.fn(),
      rect: vi.fn(),
      roundedRect: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      text: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      line: vi.fn(),
      splitTextToSize: vi.fn((txt: string) => [txt]),
      addPage: vi.fn(),
      getNumberOfPages: vi.fn(() => 1),
      setPage: vi.fn(),
      save: vi.fn(),
    };
  };
  return { jsPDF: MockDoc };
});

const MOCK_STUDENT_MESSAGE: ChatMessage = {
  id: "msg-1",
  role: "student",
  content: "What is the B.Tech CSE fee at NRI University?",
  timestamp: "2026-11-13T10:00:00Z",
  collegeId: "college_001",
  collegeName: "NRI University",
};

const MOCK_ASSISTANT_MESSAGE: ChatMessage = {
  id: "msg-2",
  role: "assistant",
  content:
    "The B.Tech CSE tuition fee at NRI University is INR 75,000 per academic year.",
  timestamp: "2026-11-13T10:00:05Z",
  collegeId: "college_001",
  collegeName: "NRI University",
  meta: {
    intent: "fees",
    confidence: 0.94,
    responseType: "verified_faq",
    verificationStatus: "VERIFIED",
    source: "https://nriit.edu.in/fee-structure",
    lastVerified: "2026-11-11",
  },
};

const MOCK_FEEDBACK_STATS: AdminFeedbackStats = {
  total_count: 10,
  positive_count: 8,
  negative_count: 2,
  positive_percentage: 80,
  by_college: { college_001: 5, college_002: 5 },
  by_reason: { "Outdated information": 2 },
  by_status: { NEW: 2, RESOLVED: 8 },
};

const MOCK_FEEDBACK_RECORD: FeedbackRecord = {
  feedback_id: "fb-100",
  session_id: "session-abc",
  message_id: "msg-2",
  college_id: "college_001",
  college_name: "NRI University",
  question: "What is the B.Tech CSE fee at NRI University?",
  answer: "The B.Tech CSE tuition fee at NRI University is INR 75,000 per academic year.",
  intent: "fees",
  rating: "thumbs_down",
  reason: "Outdated information",
  comment: "Hostel fee is not listed.",
  created_at: "2026-11-13T10:05:00Z",
  updated_at: "2026-11-13T10:05:00Z",
  status: "NEW",
  admin_notes: null,
};

const MOCK_FEEDBACK_LIST_RESPONSE: AdminFeedbackListResponse = {
  total_records: 1,
  page: 1,
  limit: 10,
  total_pages: 1,
  feedback: [MOCK_FEEDBACK_RECORD],
};

describe("SmartCollege AI Phase 6: Feedback & Chat Export / Sharing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Export & Sharing Utilities", () => {
    it("formats single message with citations and author header", () => {
      const formatted = formatSingleMessage(MOCK_ASSISTANT_MESSAGE);
      expect(formatted).toContain("SmartCollege AI (NRI University)");
      expect(formatted).toContain("The B.Tech CSE tuition fee");
      expect(formatted).toContain("Official Source: https://nriit.edu.in/fee-structure");
      expect(formatted).toContain("Verified Date: 2026-11-11");
    });

    it("formats full conversation transcript with institutional header and query count", () => {
      const full = formatFullConversation(
        [MOCK_STUDENT_MESSAGE, MOCK_ASSISTANT_MESSAGE],
        "NRI University",
      );
      expect(full).toContain("SmartCollege AI — Student Conversation Record");
      expect(full).toContain("Institution: NRI University");
      expect(full).toContain("Total Messages: 2");
      expect(full).toContain("What is the B.Tech CSE fee");
      expect(full).toContain("Official Source:");
    });

    it("exports conversation as TXT file and invokes link click", () => {
      const appendSpy = vi.spyOn(document.body, "appendChild");
      const removeSpy = vi.spyOn(document.body, "removeChild");
      window.URL.createObjectURL = vi.fn(() => "blob:test");
      window.URL.revokeObjectURL = vi.fn();

      exportConversationAsTxt(
        [MOCK_STUDENT_MESSAGE, MOCK_ASSISTANT_MESSAGE],
        "NRI University",
      );

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });

    it("exports conversation as structured multi-page PDF document", () => {
      expect(() => {
        exportConversationAsPdf(
          [MOCK_STUDENT_MESSAGE, MOCK_ASSISTANT_MESSAGE],
          "NRI University",
        );
      }).not.toThrow();
    });
  });

  describe("MessageBubble Feedback & Action Controls", () => {
    it("renders copy, share, thumbs up, and thumbs down buttons for assistant answers", () => {
      render(
        <ThemeProvider theme={theme}>
          <MessageBubble
            message={MOCK_ASSISTANT_MESSAGE}
            precedingStudentQuestion="What is the fee?"
          />
        </ThemeProvider>,
      );

      expect(screen.getByLabelText("Copy answer")).toBeInTheDocument();
      expect(screen.getByLabelText("Share answer")).toBeInTheDocument();
      expect(screen.getByLabelText("Helpful answer")).toBeInTheDocument();
      expect(screen.getByLabelText("Report issue")).toBeInTheDocument();
    });

    it("submits positive feedback when clicking thumbs up", async () => {
      const user = userEvent.setup();
      const mockSubmit = vi
        .spyOn(feedbackService, "submitFeedback")
        .mockResolvedValueOnce({
          success: true,
          message: "Feedback recorded",
          feedback: { ...MOCK_FEEDBACK_RECORD, rating: "thumbs_up" },
          is_updated: false,
        });

      const onFeedbackChange = vi.fn();
      const onNotify = vi.fn();

      render(
        <ThemeProvider theme={theme}>
          <MessageBubble
            message={MOCK_ASSISTANT_MESSAGE}
            precedingStudentQuestion="What is the fee?"
            onFeedbackChange={onFeedbackChange}
            onNotify={onNotify}
          />
        </ThemeProvider>,
      );

      const thumbsUpBtn = screen.getByLabelText("Helpful answer");
      await user.click(thumbsUpBtn);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            rating: "thumbs_up",
            message_id: "msg-2",
            college_id: "college_001",
          }),
        );
        expect(onFeedbackChange).toHaveBeenCalledWith(
          "msg-2",
          expect.objectContaining({ rating: "thumbs_up" }),
        );
        expect(onNotify).toHaveBeenCalledWith(
          expect.stringContaining("Thank you!"),
          "success",
        );
      });
    });

    it("opens dialog on thumbs down and submits negative feedback with reason and comment", async () => {
      const user = userEvent.setup();
      const mockSubmit = vi
        .spyOn(feedbackService, "submitFeedback")
        .mockResolvedValueOnce({
          success: true,
          message: "Feedback recorded",
          feedback: MOCK_FEEDBACK_RECORD,
          is_updated: false,
        });

      const onFeedbackChange = vi.fn();
      const onNotify = vi.fn();

      render(
        <ThemeProvider theme={theme}>
          <MessageBubble
            message={MOCK_ASSISTANT_MESSAGE}
            precedingStudentQuestion="What is the fee?"
            onFeedbackChange={onFeedbackChange}
            onNotify={onNotify}
          />
        </ThemeProvider>,
      );

      const thumbsDownBtn = screen.getByLabelText("Report issue");
      await user.click(thumbsDownBtn);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Help Us Improve")).toBeInTheDocument();

      // Choose "Outdated information"
      const outdatedRadio = screen.getByLabelText("Outdated information");
      await user.click(outdatedRadio);

      // Enter optional comment
      const commentInput = screen.getByPlaceholderText(
        "Tell us more about what was incorrect or missing...",
      );
      await user.type(commentInput, "Fee changed this year");

      // Submit
      const submitBtn = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            rating: "thumbs_down",
            reason: "Outdated information",
            comment: "Fee changed this year",
          }),
        );
        expect(onFeedbackChange).toHaveBeenCalledWith(
          "msg-2",
          expect.objectContaining({
            rating: "thumbs_down",
            reason: "Outdated information",
          }),
        );
        expect(onNotify).toHaveBeenCalledWith(
          expect.stringContaining("Feedback received"),
          "success",
        );
      });
    });

    it("displays existing rating chips if message was already rated", () => {
      const ratedMessage: ChatMessage = {
        ...MOCK_ASSISTANT_MESSAGE,
        feedback: {
          rating: "thumbs_up",
          submittedAt: "2026-11-13T10:00:00Z",
        },
      };

      render(
        <ThemeProvider theme={theme}>
          <MessageBubble message={ratedMessage} />
        </ThemeProvider>,
      );

      expect(screen.getByText("Helpful")).toBeInTheDocument();
    });

    it("displays error notification with message when thumbs up submission fails", async () => {
      const user = userEvent.setup();
      vi.spyOn(feedbackService, "submitFeedback").mockRejectedValueOnce(
        new ApiServiceError("Unable to reach the chatbot API at http://127.0.0.1:8000.", 0, "NETWORK_ERROR"),
      );

      const onFeedbackChange = vi.fn();
      const onNotify = vi.fn();

      render(
        <ThemeProvider theme={theme}>
          <MessageBubble
            message={MOCK_ASSISTANT_MESSAGE}
            precedingStudentQuestion="What is the fee?"
            onFeedbackChange={onFeedbackChange}
            onNotify={onNotify}
          />
        </ThemeProvider>,
      );

      const thumbsUpBtn = screen.getByLabelText("Helpful answer");
      await user.click(thumbsUpBtn);

      await waitFor(() => {
        expect(onNotify).toHaveBeenCalledWith(
          "Unable to reach the chatbot API at http://127.0.0.1:8000.",
          "error",
        );
      });
    });

    it("displays error notification with message when negative feedback submission fails", async () => {
      const user = userEvent.setup();
      vi.spyOn(feedbackService, "submitFeedback").mockRejectedValueOnce(
        new ApiServiceError("Invalid college_id provided.", 400, "BAD_REQUEST"),
      );

      const onFeedbackChange = vi.fn();
      const onNotify = vi.fn();

      render(
        <ThemeProvider theme={theme}>
          <MessageBubble
            message={MOCK_ASSISTANT_MESSAGE}
            precedingStudentQuestion="What is the fee?"
            onFeedbackChange={onFeedbackChange}
            onNotify={onNotify}
          />
        </ThemeProvider>,
      );

      const thumbsDownBtn = screen.getByLabelText("Report issue");
      await user.click(thumbsDownBtn);

      const submitBtn = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(onNotify).toHaveBeenCalledWith(
          "Invalid college_id provided.",
          "error",
        );
      });
    });

    it("does not render 'Related verified questions' even when relatedVerifiedFaqs are present in meta", () => {
      const messageWithRelated: ChatMessage = {
        ...MOCK_ASSISTANT_MESSAGE,
        meta: {
          ...MOCK_ASSISTANT_MESSAGE.meta,
          relatedVerifiedFaqs: [
            {
              college_id: "college_001",
              college_name: "NRI University",
              category: "fees",
              question: "What is the hostel fee structure?",
              answer: "Hostel fee is INR 45,000.",
              source: "https://nriit.edu.in",
              last_verified: "2026-11-11",
              verification_status: "VERIFIED",
            },
          ],
        },
      };

      render(
        <ThemeProvider theme={theme}>
          <MessageBubble message={messageWithRelated} />
        </ThemeProvider>,
      );

      expect(screen.queryByText(/Related verified questions/i)).not.toBeInTheDocument();
      expect(screen.queryByText("What is the hostel fee structure?")).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "The B.Tech CSE tuition fee at NRI University is INR 75,000 per academic year.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Last verified: 2026-11-11")).toBeInTheDocument();
    });
  });

  describe("ChatWindow Header Export & Share Menu", () => {
    it("opens Export & Share menu and triggers conversation copy", async () => {
      const user = userEvent.setup();
      const onSendQuestion = vi.fn().mockResolvedValue(undefined);

      // Mock navigator.clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <CollegeProvider>
              <ChatWindow
                messages={[MOCK_STUDENT_MESSAGE, MOCK_ASSISTANT_MESSAGE]}
                isSending={false}
                chatError={null}
                faqsModalOpen={false}
                onSetFaqsModalOpen={vi.fn()}
                onSendQuestion={onSendQuestion}
                onClearConversation={vi.fn()}
                onDismissChatError={vi.fn()}
              />
            </CollegeProvider>
          </MemoryRouter>
        </ThemeProvider>,
      );

      const exportBtn = screen.getByRole("button", {
        name: /Share & Export options/i,
      });
      expect(exportBtn).toHaveTextContent("Export");
      await user.click(exportBtn);

      expect(screen.getByText("Copy Conversation")).toBeInTheDocument();
      expect(screen.getByText("Share Conversation")).toBeInTheDocument();
      expect(screen.getByText("Export as TXT")).toBeInTheDocument();
      expect(screen.getByText("Export as PDF")).toBeInTheDocument();

      const copyItem = screen.getByText("Copy Conversation");
      await user.click(copyItem);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalled();
        expect(
          screen.getByText("Full conversation copied to clipboard!"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Admin Feedback Management Console", () => {
    it("renders KPI cards, displays feedback table records, and inspects details", async () => {
      const user = userEvent.setup();

      vi.spyOn(adminService, "listColleges").mockResolvedValueOnce({
        total_colleges: 1,
        colleges: [
          {
            college_id: "college_001",
            college_name: "NRI University",
            short_code: "NRIU",
            location: "Agiripalli",
            logo_url: "/logos/college_001.png",
            is_primary_profile: true,
            profile_status: "PARTIALLY_VERIFIED",
            verified_faq_count: 15,
            pending_faq_count: 15,
            last_verified: "2026-11-11",
          },
        ],
      });
      vi.spyOn(adminService, "getFeedbackStats").mockResolvedValue(MOCK_FEEDBACK_STATS);
      vi.spyOn(adminService, "listFeedback").mockResolvedValue(
        MOCK_FEEDBACK_LIST_RESPONSE,
      );

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <AdminFeedbackManagement />
          </MemoryRouter>
        </ThemeProvider>,
      );

      // Loading state disappears
      await waitFor(() => {
        expect(
          screen.getByText("Student Feedback Management"),
        ).toBeInTheDocument();
      });

      // Verify KPI values
      expect(screen.getByText("Total Feedback")).toBeInTheDocument();
      expect(screen.getAllByText("10")[0]).toBeInTheDocument();
      expect(screen.getByText("Positive Ratings")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("Issue Reports")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("80%")).toBeInTheDocument();

      // Verify Table row
      expect(screen.getByText("NRI University")).toBeInTheDocument();
      expect(
        screen.getByText("What is the B.Tech CSE fee at NRI University?"),
      ).toBeInTheDocument();
      expect(screen.getByText('"Hostel fee is not listed."')).toBeInTheDocument();
      expect(screen.getByText("NEW")).toBeInTheDocument();

      // Open detail inspection
      const viewBtn = screen.getByLabelText(
        "View feedback for What is the B.Tech CSE fee at NRI University?",
      );
      await user.click(viewBtn);

      expect(
        screen.getByText("Feedback Inspection & Status"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "The B.Tech CSE tuition fee at NRI University is INR 75,000 per academic year.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Administrative Resolution")).toBeInTheDocument();
    });

    it("allows updating feedback status and saving notes", async () => {
      const user = userEvent.setup();

      vi.spyOn(adminService, "listColleges").mockResolvedValueOnce({
        total_colleges: 0,
        colleges: [],
      });
      vi.spyOn(adminService, "getFeedbackStats").mockResolvedValue(MOCK_FEEDBACK_STATS);
      vi.spyOn(adminService, "listFeedback").mockResolvedValue(
        MOCK_FEEDBACK_LIST_RESPONSE,
      );

      const updateSpy = vi.spyOn(adminService, "updateFeedback").mockResolvedValueOnce({
        ...MOCK_FEEDBACK_RECORD,
        status: "RESOLVED",
        admin_notes: "Hostel fee verified with office.",
      });

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <AdminFeedbackManagement />
          </MemoryRouter>
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(
          screen.getByLabelText(
            "View feedback for What is the B.Tech CSE fee at NRI University?",
          ),
        ).toBeInTheDocument();
      });

      const viewBtn = screen.getByLabelText(
        "View feedback for What is the B.Tech CSE fee at NRI University?",
      );
      await user.click(viewBtn);

      // Select status "RESOLVED"
      const statusSelect = screen.getByLabelText("Review Status");
      await user.click(statusSelect);

      const resolvedOption = await screen.findByRole("option", {
        name: "RESOLVED (FAQ updated/verified)",
      });
      await user.click(resolvedOption);

      // Add admin note
      const notesInput = screen.getByPlaceholderText(
        "e.g. Updated fee FAQ record, verified with dean of admissions...",
      );
      await user.type(notesInput, "Hostel fee verified with office.");

      // Save
      const saveBtn = screen.getByRole("button", { name: "Save Status" });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith("fb-100", {
          status: "RESOLVED",
          admin_notes: "Hostel fee verified with office.",
        });
        expect(
          screen.getByText("Feedback record status updated to RESOLVED."),
        ).toBeInTheDocument();
      });
    });
  });
});
