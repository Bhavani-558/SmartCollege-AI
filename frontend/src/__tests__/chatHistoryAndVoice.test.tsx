import { MemoryRouter } from "react-router-dom";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { AppRoutes } from "../App";
import { CollegeProvider } from "../contexts/CollegeContext";
import type {
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from "../hooks/useVoiceRecognition";
import { chatService } from "../services/chatService";
import { collegeService } from "../services/collegeService";
import theme from "../theme/theme";
import type {
  ChatResponse,
  CollegeDetailResponse,
  CollegeFAQListResponse,
  CollegeListResponse,
  CollegeSelectResponse,
  HealthResponse,
} from "../types/api";
import {
  CHAT_HISTORY_STORAGE_KEY,
  generateConversationTitle,
} from "../utils/chatHistoryStorage";
import { PENDING_VERIFICATION_MESSAGE } from "../utils/constants";

const TEST_COLLEGES: CollegeListResponse = {
  total_colleges: 2,
  colleges: [
    {
      college_id: "college_001",
      college_name: "NRI University",
      official_name: "Dr. RVR NRI Institute of Technology (Deemed to be University)",
      short_code: "NRIU",
      location: "Agiripalli, Vijayawada Rural, Andhra Pradesh",
      logo_url: "/logos/college_001.png",
      is_primary_profile: true,
      profile_status: "PARTIALLY_VERIFIED",
      verified_faq_count: 15,
      pending_faq_count: 15,
      last_verified: "2026-11-11",
    },
    {
      college_id: "college_002",
      college_name: "SRM University-AP",
      official_name: "SRM University-AP, Andhra Pradesh",
      short_code: "SRMAP",
      location: "Neerukonda, Mangalagiri, Andhra Pradesh",
      logo_url: "/logos/college_002.png",
      is_primary_profile: false,
      profile_status: "VERIFIED",
      verified_faq_count: 23,
      pending_faq_count: 7,
      last_verified: "2026-11-12",
    },
  ],
};

const TEST_HEALTH: HealthResponse = {
  status: "ok",
  app_name: "AI-Powered Multi-College Student Chatbot API",
  version: "1.0.0",
  active_faq_backend: "json",
  postgres_prepared: true,
  postgres_configured: false,
  intent_classifier_loaded: true,
  num_intents: 30,
  confidence_threshold: 0.25,
  total_colleges: 2,
};

function makeDetail(collegeId: string): CollegeDetailResponse {
  const c =
    TEST_COLLEGES.colleges.find((item) => item.college_id === collegeId) ??
    TEST_COLLEGES.colleges[0];
  return {
    college_id: c.college_id,
    college_name: c.college_name,
    official_name: c.official_name,
    short_code: c.short_code,
    location: c.location,
    logo_url: c.logo_url,
    ugc_status: null,
    is_primary_profile: c.is_primary_profile,
    profile_status: c.profile_status,
    official_sources: [],
    supported_categories: ["admissions", "fees", "college_location"],
    verified_fields: {},
    institutional_data: {},
    last_verified: c.last_verified,
  };
}

function makeFaqs(collegeId: string): CollegeFAQListResponse {
  const c =
    TEST_COLLEGES.colleges.find((item) => item.college_id === collegeId) ??
    TEST_COLLEGES.colleges[0];
  return {
    college_id: c.college_id,
    college_name: c.college_name,
    total_records: 0,
    verified_count: c.verified_faq_count,
    pending_count: c.pending_faq_count,
    faqs: [],
  };
}

function renderChat() {
  return render(
    <ThemeProvider theme={theme}>
      <CollegeProvider>
        <MemoryRouter initialEntries={["/chat"]}>
          <AppRoutes />
        </MemoryRouter>
      </CollegeProvider>
    </ThemeProvider>,
  );
}

async function waitForReady() {
  expect(screen.getByText("General Student Support")).toBeInTheDocument();
  await waitFor(() => {
    expect(collegeService.listColleges).toHaveBeenCalled();
    expect(
      screen.getAllByRole("combobox", { name: /Select College/i })[0],
    ).not.toHaveAttribute("aria-disabled", "true");
  });
}

async function selectCollegeFromSidebar(collegeNamePattern: RegExp) {
  const user = userEvent.setup({ delay: null });
  const combobox = screen.getAllByRole("combobox", { name: /Select College/i })[0];
  await user.click(combobox);
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: collegeNamePattern }));
}

function installMockSpeechRecognition() {
  const instances: MockSpeechRecognition[] = [];

  class MockSpeechRecognition implements SpeechRecognitionLike {
    lang = "";
    continuous = false;
    interimResults = false;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null = null;
    onend: (() => void) | null = null;
    started = false;
    stopped = false;
    aborted = false;

    constructor() {
      instances.push(this);
    }

    start = vi.fn(() => {
      this.started = true;
    });

    stop = vi.fn(() => {
      this.stopped = true;
      this.onend?.();
    });

    abort = vi.fn(() => {
      this.aborted = true;
      this.onend?.();
    });

    emitTranscript(text: string, isFinal = true) {
      const event: SpeechRecognitionEventLike = {
        results: {
          length: 1,
          0: {
            isFinal,
            length: 1,
            0: { transcript: text, confidence: 0.95 },
          },
        },
      };
      this.onresult?.(event);
    }

    emitError(errorCode: string) {
      this.onerror?.({ error: errorCode });
    }
  }

  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    writable: true,
    value: MockSpeechRecognition,
  });

  return {
    instances,
    cleanup() {
      delete (window as { SpeechRecognition?: unknown }).SpeechRecognition;
      delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    },
  };
}

describe("Chat History and Voice Input Features", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    delete (window as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    vi.spyOn(collegeService, "getHealth").mockResolvedValue(TEST_HEALTH);
    vi.spyOn(collegeService, "listColleges").mockResolvedValue(TEST_COLLEGES);
    vi.spyOn(collegeService, "selectCollege").mockImplementation(
      async (collegeId, previousCollegeId): Promise<CollegeSelectResponse> => {
        const chosen =
          TEST_COLLEGES.colleges.find((c) => c.college_id === collegeId) ??
          TEST_COLLEGES.colleges[0];
        return {
          selected_college: chosen,
          previous_college_id: previousCollegeId ?? null,
          context_reset: true,
          supported_categories: makeDetail(collegeId).supported_categories,
          message: `Switched active college to ${chosen.college_name} (${chosen.college_id}).`,
        };
      },
    );
    vi.spyOn(collegeService, "getCollegeDetail").mockImplementation(
      async (collegeId) => makeDetail(collegeId),
    );
    vi.spyOn(collegeService, "getCollegeFaqs").mockImplementation(
      async (collegeId) => makeFaqs(collegeId),
    );
  });

  it("saves general and college-specific conversations automatically, persists across refresh, and restores verified, pending, and source links", async () => {
    const user = userEvent.setup({ delay: null });
    vi.spyOn(chatService, "sendMessage").mockImplementation(
      async ({ question, college_id }): Promise<ChatResponse> => {
        if (!college_id) {
          return {
            question,
            intent: "greeting",
            candidate_intent: "greeting",
            confidence: 0.96,
            is_unknown: false,
            college_specific: false,
            response_type: "general",
            verification_status: "GENERAL",
            college_id: null,
            college_name: null,
            answer: "Hello! Ask about any registered college or general topic.",
            related_verified_faqs: [],
            top_candidates: [],
          };
        }
        if (college_id === "college_002" && question.toLowerCase().includes("fees")) {
          return {
            question,
            intent: "fees",
            candidate_intent: "fees",
            confidence: 0.92,
            is_unknown: false,
            college_specific: true,
            response_type: "verified_faq",
            verification_status: "VERIFIED",
            college_id: "college_002",
            college_name: "SRM University-AP",
            answer:
              "B.Tech CSE annual tuition is Rs. 4,50,000 on https://www.srmap.edu.in/admission/seas-btech-tuition-fee/.",
            matched_question: "What are the tuition fees for BTech CSE?",
            source: "https://www.srmap.edu.in/admission/seas-btech-tuition-fee/",
            last_verified: "2026-11-12",
            related_verified_faqs: [
              {
                college_id: "college_002",
                college_name: "SRM University-AP",
                category: "fees",
                question: "What is the BBA fee structure at SRM University-AP?",
                answer: "PSB BBA tuition is Rs. 2,55,000 per year.",
                source: "https://www.srmap.edu.in/admission/psb-bba-tuition-fee/",
                last_verified: "2026-11-12",
                verification_status: "VERIFIED",
              },
            ],
            top_candidates: [{ intent: "fees", confidence: 0.92 }],
          };
        }
        return {
          question,
          intent: "hostel",
          candidate_intent: "hostel",
          confidence: 0.88,
          is_unknown: false,
          college_specific: true,
          response_type: "pending_verification",
          verification_status: "PENDING_VERIFICATION",
          college_id: "college_001",
          college_name: "NRI University",
          answer: "PENDING_VERIFICATION",
          source: "https://rvrnriuniversity.edu.in/admissions/",
          last_verified: "PENDING_VERIFICATION",
          related_verified_faqs: [],
          top_candidates: [{ intent: "hostel", confidence: 0.88 }],
        };
      },
    );

    const firstRender = renderChat();
    await waitForReady();

    // 1. General conversation saved without selecting a college
    const input = screen.getByLabelText("Student question input");
    await user.type(input, "Hello assistant can you help me?{enter}");
    expect(
      await screen.findByText("Hello! Ask about any registered college or general topic."),
    ).toBeInTheDocument();

    // 2. College-specific conversation (SRM University-AP) saved separately
    await selectCollegeFromSidebar(/SRM University-AP/i);
    await waitFor(() => {
      expect(collegeService.selectCollege).toHaveBeenCalledWith("college_002", null);
    });
    await user.type(screen.getByLabelText("Student question input"), "What are the BTech tuition fees at SRM University-AP?{enter}");
    expect(
      await screen.findByText(/B\.Tech CSE annual tuition is Rs\. 4,50,000/i),
    ).toBeInTheDocument();

    // 3. Pending verification conversation for college_001 saved with original college_id
    await selectCollegeFromSidebar(/NRI University/i);
    await waitFor(() => {
      expect(collegeService.selectCollege).toHaveBeenCalledWith("college_001", "college_002");
    });
    await user.type(screen.getByLabelText("Student question input"), "What are NRI University hostel fees?{enter}");
    expect(await screen.findByText(PENDING_VERIFICATION_MESSAGE)).toBeInTheDocument();

    const storedRaw = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw!);
    expect(stored).toHaveLength(3);

    // Simulate page refresh / browser reopening
    firstRender.unmount();
    renderChat();
    await waitForReady();

    // Open Chat History dialog and verify all 3 persisted conversations exist
    await user.click(screen.getAllByRole("button", { name: /Chat History/i })[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Hello assistant can you help me?")).toBeInTheDocument();
    expect(
      within(dialog).getByText("What are the BTech tuition fees at SRM University-AP?"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("SRM University-AP")).toBeInTheDocument();
    expect(within(dialog).getByText("NRI University")).toBeInTheDocument();
    expect(within(dialog).getByText("General Assistant")).toBeInTheDocument();

    // Reopen SRM University-AP verified conversation -> switches college & restores verified answer + source
    await user.click(
      within(dialog).getByText("What are the BTech tuition fees at SRM University-AP?"),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText("B.Tech CSE annual tuition is Rs. 4,50,000."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Official Admissions Portal" })).toHaveAttribute(
      "href",
      "https://www.srmap.edu.in/admission/seas-btech-tuition-fee/",
    );
    expect(screen.queryByText(/Related verified questions/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText("What is the BBA fee structure at SRM University-AP?"),
    ).not.toBeInTheDocument();

    // Reopen NRI University pending conversation
    await user.click(screen.getAllByRole("button", { name: /Chat History/i })[0]);
    await user.click(
      await within(await screen.findByRole("dialog")).findByText(
        "What are NRI University hostel fees?",
      ),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByText(PENDING_VERIFICATION_MESSAGE)).toBeInTheDocument();

    // Reopen General Assistant conversation without a college selected
    await user.click(screen.getAllByRole("button", { name: /Chat History/i })[0]);
    await user.click(
      await within(await screen.findByRole("dialog")).findByText(
        "Hello assistant can you help me?",
      ),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText("Hello! Ask about any registered college or general topic."),
    ).toBeInTheDocument();
    expect(screen.getByText("General Student Support")).toBeInTheDocument();
  }, 30000);

  it("uses Clear Chat to start a fresh conversation without deleting saved history, removes duplicate New Chat button, and keeps delete controls", async () => {
    const user = userEvent.setup({ delay: null });
    vi.spyOn(chatService, "sendMessage").mockImplementation(
      async ({ question }): Promise<ChatResponse> => ({
        question,
        intent: "greeting",
        candidate_intent: "greeting",
        confidence: 0.95,
        is_unknown: false,
        college_specific: false,
        response_type: "general",
        verification_status: "GENERAL",
        college_id: null,
        college_name: null,
        answer: `Answer to: ${question}`,
        related_verified_faqs: [],
        top_candidates: [],
      }),
    );

    renderChat();
    await waitForReady();

    // No duplicate New Chat button should be rendered in the sidebar
    expect(screen.queryByRole("button", { name: /New Chat/i })).not.toBeInTheDocument();

    // Create first saved general conversation
    await user.type(screen.getByLabelText("Student question input"), "First saved question{enter}");
    expect(await screen.findByText("Answer to: First saved question")).toBeInTheDocument();

    // Use Clear Chat -> clears active view only and preserves localStorage history
    await user.click(screen.getByRole("button", { name: /Clear Chat/i }));
    await waitFor(() => {
      expect(screen.queryByText("First saved question")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY)).not.toBeNull();

    // Create second saved conversation
    await user.type(screen.getByLabelText("Student question input"), "Second saved question{enter}");
    expect(await screen.findByText("Answer to: Second saved question")).toBeInTheDocument();

    // Open Chat History: no New Chat button inside dialog, and both conversations remain saved
    await user.click(screen.getAllByRole("button", { name: /Chat History/i })[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /New Chat/i })).not.toBeInTheDocument();
    expect(within(dialog).getByText("First saved question")).toBeInTheDocument();
    expect(within(dialog).getByText("Second saved question")).toBeInTheDocument();

    // Reopen First saved question to prove Clear Chat preserved it
    await user.click(within(dialog).getByText("First saved question"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Answer to: First saved question")).toBeInTheDocument();

    // Reopen Chat History for individual deletion and Delete All with confirmation
    await user.click(screen.getAllByRole("button", { name: /Chat History/i })[0]);
    const historyDialog = await screen.findByRole("dialog");
    await user.click(
      within(historyDialog).getByRole("button", {
        name: "Delete conversation First saved question",
      }),
    );
    expect(within(historyDialog).queryByText("First saved question")).not.toBeInTheDocument();
    expect(within(historyDialog).getByText("Second saved question")).toBeInTheDocument();

    // Delete All requires confirmation; cancelling preserves history
    await user.click(within(historyDialog).getByRole("button", { name: /Delete All/i }));
    expect(
      within(historyDialog).getByText(/Delete all saved conversations\?/i),
    ).toBeInTheDocument();
    await user.click(within(historyDialog).getByRole("button", { name: /^Cancel$/i }));
    expect(within(historyDialog).getByText("Second saved question")).toBeInTheDocument();

    // Confirming Delete All clears everything and shows empty state
    await user.click(within(historyDialog).getByRole("button", { name: /Delete All/i }));
    await user.click(within(historyDialog).getByRole("button", { name: /Confirm Delete All/i }));
    expect(within(historyDialog).getByText("No saved conversations yet")).toBeInTheDocument();
    expect(window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY)).toBeNull();
  }, 25000);

  it("supports Speech-to-Text with en-IN default, editing before send, stop/cancel, error handling, and saving voice queries in Chat History", async () => {
    const user = userEvent.setup({ delay: null });

    // 1. Unsupported browser handling when SpeechRecognition is absent
    const unsupportedRender = renderChat();
    await waitForReady();
    await user.click(screen.getByRole("button", { name: "Start voice input" }));
    expect(
      await screen.findByText(/Voice input is not supported in this browser\. Please use Chrome or Edge/i),
    ).toBeInTheDocument();
    unsupportedRender.unmount();

    // 2. Install mocked Web Speech API and remount cleanly
    const mockSpeech = installMockSpeechRecognition();
    renderChat();
    await waitForReady();
    try {
      const sendSpy = vi.spyOn(chatService, "sendMessage").mockResolvedValue({
        question: "What are the BTech fees at SRM University-AP?",
        intent: "fees",
        candidate_intent: "fees",
        confidence: 0.91,
        is_unknown: false,
        college_specific: true,
        response_type: "verified_faq",
        verification_status: "VERIFIED",
        college_id: "college_002",
        college_name: "SRM University-AP",
        answer: "CSE Core annual fee is Rs. 4,50,000.",
        source: "https://www.srmap.edu.in/admission/seas-btech-tuition-fee/",
        last_verified: "2026-11-12",
        related_verified_faqs: [],
        top_candidates: [],
      });

      // Permission denied error check
      await user.click(screen.getByRole("button", { name: "Start voice input" }));
      expect(mockSpeech.instances[0].lang).toBe("en-IN");
      expect(await screen.findByText(/Listening \(en-IN\)\.\.\./i)).toBeInTheDocument();
      act(() => {
        mockSpeech.instances[0].emitError("not-allowed");
      });
      expect(
        await screen.findByText(/Microphone permission was denied/i),
      ).toBeInTheDocument();

      // Unavailable microphone error check
      await user.click(screen.getByRole("button", { name: "Start voice input" }));
      act(() => {
        mockSpeech.instances[1].emitError("audio-capture");
      });
      expect(
        await screen.findByText(/No microphone was detected/i),
      ).toBeInTheDocument();

      // Cancel recording reverts pre-existing draft text cleanly
      const input = screen.getByLabelText("Student question input") as HTMLTextAreaElement;
      await user.type(input, "Existing draft");
      await user.click(screen.getByRole("button", { name: "Start voice input" }));
      act(() => {
        mockSpeech.instances[2].emitTranscript("spurious audio", false);
      });
      expect(input.value).toContain("spurious audio");
      await user.click(screen.getByRole("button", { name: "Cancel recording" }));
      expect(input.value).toBe("Existing draft");
      expect(screen.queryByText(/Listening \(en-IN\)\.\.\./i)).not.toBeInTheDocument();
      await user.clear(input);

      // Select SRM University-AP before speaking a college-specific query
      await selectCollegeFromSidebar(/SRM University-AP/i);

      // Speak, Stop Recording, verify auto-send did NOT happen, edit text, then click Send
      await user.click(screen.getByRole("button", { name: "Start voice input" }));
      act(() => {
        mockSpeech.instances[3].emitTranscript("What are the BTech fees", true);
      });
      expect(input.value).toBe("What are the BTech fees");
      await user.click(screen.getByRole("button", { name: "Stop recording" }));
      expect(sendSpy).not.toHaveBeenCalled();

      await user.type(input, " at SRM University-AP?");
      await user.click(screen.getByRole("button", { name: "Send message" }));

      await waitFor(() => {
        expect(sendSpy).toHaveBeenCalledWith({
          question: "What are the BTech fees at SRM University-AP?",
          college_id: "college_002",
        });
      });
      expect(await screen.findByText("CSE Core annual fee is Rs. 4,50,000.")).toBeInTheDocument();

      // Voice-transcribed question + answer saved in Chat History under college_002
      await user.click(screen.getAllByRole("button", { name: /Chat History/i })[0]);
      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText(
          generateConversationTitle("What are the BTech fees at SRM University-AP?"),
        ),
      ).toBeInTheDocument();
      expect(within(dialog).getByText("SRM University-AP")).toBeInTheDocument();
    } finally {
      mockSpeech.cleanup();
    }
  }, 25000);
});

