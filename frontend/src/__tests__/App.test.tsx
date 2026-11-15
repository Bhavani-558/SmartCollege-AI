import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { AppRoutes } from "../App";
import { CollegeProvider } from "../contexts/CollegeContext";
import { ApiServiceError } from "../services/api";
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
  PENDING_VERIFICATION_MESSAGE,
  UNKNOWN_QUERY_MESSAGE,
} from "../utils/constants";

const MOCK_COLLEGES: CollegeListResponse = {
  total_colleges: 5,
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
    {
      college_id: "college_003",
      college_name: "KL Deemed to be University",
      official_name: "Koneru Lakshmaiah Education Foundation (KL Deemed to be University)",
      short_code: "KLU",
      location: "Vaddeswaram, Guntur District, Andhra Pradesh",
      logo_url: "/logos/college_003.png",
      is_primary_profile: false,
      profile_status: "VERIFIED",
      verified_faq_count: 28,
      pending_faq_count: 2,
      last_verified: "2026-11-12",
    },
    {
      college_id: "college_004",
      college_name: "Siddhartha Academy of Higher Education",
      official_name:
        "Siddhartha Academy of Higher Education (Formerly Velagapudi Ramakrishna Siddhartha Engineering College)",
      short_code: "SAHE",
      location: "Kanuru, Vijayawada, Andhra Pradesh",
      logo_url: "/logos/college_004.jpg",
      is_primary_profile: false,
      profile_status: "VERIFIED",
      verified_faq_count: 25,
      pending_faq_count: 5,
      last_verified: "2026-11-12",
    },
    {
      college_id: "college_005",
      college_name: "Prasad V Potluri Siddhartha Institute of Technology",
      official_name: "Prasad V. Potluri Siddhartha Institute of Technology (Autonomous)",
      short_code: "PVPSIT",
      location: "Kanuru, Vijayawada, Andhra Pradesh",
      logo_url: "/logos/college_005.png",
      is_primary_profile: false,
      profile_status: "VERIFIED",
      verified_faq_count: 26,
      pending_faq_count: 4,
      last_verified: "2026-11-12",
    },
  ],
};

const MOCK_HEALTH: HealthResponse = {
  status: "ok",
  app_name: "AI-Powered Multi-College Student Chatbot API",
  version: "1.0.0",
  active_faq_backend: "json",
  postgres_prepared: true,
  postgres_configured: false,
  intent_classifier_loaded: true,
  num_intents: 30,
  confidence_threshold: 0.25,
  total_colleges: 5,
};

function makeCollegeDetail(collegeId: string): CollegeDetailResponse {
  const summary =
    MOCK_COLLEGES.colleges.find((c) => c.college_id === collegeId) ??
    MOCK_COLLEGES.colleges[0];
  return {
    college_id: summary.college_id,
    college_name: summary.college_name,
    official_name: summary.official_name,
    short_code: summary.short_code,
    location: summary.location,
    logo_url: summary.logo_url,
    ugc_status:
      collegeId === "college_001"
        ? "An Institution deemed to be University u/s 3 of UGC Act, 1956"
        : null,
    is_primary_profile: summary.is_primary_profile,
    profile_status: summary.profile_status,
    official_sources:
      collegeId === "college_001"
        ? ["https://nriuniversity.in/", "https://rvrnriuniversity.edu.in/admissions/"]
        : [],
    supported_categories: [
      "admissions",
      "courses",
      "fees",
      "scholarships",
      "hostel",
      "college_location",
      "contact_info",
    ],
    verified_fields: {},
    institutional_data: {},
    last_verified: summary.last_verified,
  };
}

function makeCollegeFaqs(collegeId: string): CollegeFAQListResponse {
  if (collegeId === "college_001") {
    return {
      college_id: "college_001",
      college_name: "NRI University",
      total_records: 2,
      verified_count: 1,
      pending_count: 1,
      faqs: [
        {
          college_id: "college_001",
          college_name: "NRI University",
          category: "college_location",
          question: "Where is the NRI University campus located?",
          answer:
            "Dr. RVR NRI Institute of Technology (NRI University) is located at Agiripalli, Andhra Pradesh - 521212.",
          source: "https://rvrnriuniversity.edu.in/contact-us/",
          last_verified: "2026-11-11",
          verification_status: "VERIFIED",
        },
        {
          college_id: "college_001",
          college_name: "NRI University",
          category: "fees",
          question: "What is the tuition fee structure?",
          answer: "PENDING_VERIFICATION",
          source: "https://rvrnriuniversity.edu.in/admissions/",
          last_verified: "2026-11-11",
          verification_status: "PENDING_VERIFICATION",
        },
      ],
    };
  }
  return {
    college_id: collegeId,
    college_name: "Partner College Profile 2 (Template)",
    total_records: 1,
    verified_count: 0,
    pending_count: 1,
    faqs: [
      {
        college_id: collegeId,
        college_name: "Partner College Profile 2 (Template)",
        category: "college_location",
        question: "Where is the college located?",
        answer: "PENDING_VERIFICATION",
        source: "PENDING_VERIFICATION",
        last_verified: "PENDING_VERIFICATION",
        verification_status: "PENDING_VERIFICATION",
      },
    ],
  };
}

function renderWithProviders(initialPath = "/") {
  return render(
    <ThemeProvider theme={theme}>
      <CollegeProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <AppRoutes />
        </MemoryRouter>
      </CollegeProvider>
    </ThemeProvider>,
  );
}

async function waitForChatReady() {
  expect(screen.getByText("General Student Support")).toBeInTheDocument();
  await waitFor(() => {
    expect(collegeService.listColleges).toHaveBeenCalled();
    expect(
      screen.getAllByRole("combobox", { name: /Select College/i })[0],
    ).not.toHaveAttribute("aria-disabled", "true");
  });
}

describe("Multi-College Chatbot Frontend", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(collegeService, "getHealth").mockResolvedValue(MOCK_HEALTH);
    vi.spyOn(collegeService, "listColleges").mockResolvedValue(MOCK_COLLEGES);
    vi.spyOn(collegeService, "selectCollege").mockImplementation(
      async (collegeId, previousCollegeId): Promise<CollegeSelectResponse> => {
        const chosen =
          MOCK_COLLEGES.colleges.find((c) => c.college_id === collegeId) ??
          MOCK_COLLEGES.colleges[0];
        return {
          selected_college: chosen,
          previous_college_id: previousCollegeId ?? null,
          context_reset: true,
          supported_categories: makeCollegeDetail(collegeId).supported_categories,
          message: `Switched active college to ${chosen.college_name} (${chosen.college_id}).`,
        };
      },
    );
    vi.spyOn(collegeService, "getCollegeDetail").mockImplementation(
      async (collegeId) => makeCollegeDetail(collegeId),
    );
    vi.spyOn(collegeService, "getCollegeFaqs").mockImplementation(
      async (collegeId) => makeCollegeFaqs(collegeId),
    );
  });

  it("renders landing page requirements and navigates to chat via Get Started", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders("/");

    expect(screen.getByText("Your Smart College Assistant")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Empowering Students with Reliable, Accessible, and Institution-Specific Academic Guidance.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Multi-College Support")).toBeInTheDocument();
    expect(screen.getByText("AI-Based Intent Recognition")).toBeInTheDocument();
    expect(screen.getByText("Instant Student Query Responses")).toBeInTheDocument();
    expect(screen.getByText("College-Specific Information")).toBeInTheDocument();

    expect(await screen.findByText("SRM University-AP")).toBeInTheDocument();
    expect(screen.getByText("KL Deemed to be University")).toBeInTheDocument();
    expect(
      screen.getByText("Siddhartha Academy of Higher Education"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Prasad V Potluri Siddhartha Institute of Technology"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Neerukonda, Mangalagiri, Andhra Pradesh"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "SRM University-AP logo" }),
    ).toHaveAttribute("src", "/logos/college_002.png");
    expect(
      screen.getByRole("img", {
        name: "Prasad V Potluri Siddhartha Institute of Technology logo",
      }),
    ).toHaveAttribute("src", "/logos/college_005.png");

    // Registered Institutions cards show only green Verified count badges (no Pending count badges)
    for (const college of MOCK_COLLEGES.colleges) {
      expect(
        screen.getByText(`${college.verified_faq_count} Verified`),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(`${college.pending_faq_count} Pending`),
      ).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/\d+\s+Pending/i)).not.toBeInTheDocument();

    // Only the center hero "Get Started" CTA should be present (navbar CTA removed)
    const getStartedButtons = screen.getAllByRole("button", { name: /Get Started/i });
    expect(getStartedButtons).toHaveLength(1);
    await user.click(getStartedButtons[0]);

    expect(
      await screen.findByLabelText("Student question input"),
    ).toBeInTheDocument();
  });

  it(
    "loads colleges, sends general/verified/pending/unknown queries, and resets context when switching colleges",
    async () => {
      const user = userEvent.setup({ delay: null });

    vi.spyOn(chatService, "sendMessage").mockImplementation(
      async ({ question, college_id }): Promise<ChatResponse> => {
        if (!college_id && question.toLowerCase().includes("hello")) {
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
            answer: "Hello! How can I assist you with college information today?",
            related_verified_faqs: [],
            top_candidates: [{ intent: "greeting", confidence: 0.96 }],
          };
        }

        if (college_id === "college_001" && question.toLowerCase().includes("located")) {
          return {
            question,
            intent: "college_location",
            candidate_intent: "college_location",
            confidence: 0.91,
            is_unknown: false,
            college_specific: true,
            response_type: "verified_faq",
            verification_status: "VERIFIED",
            college_id: "college_001",
            college_name: "NRI University",
            answer: "NRI University is located at Agiripalli, Andhra Pradesh - 521212.",
            matched_question: "Where is the NRI University campus located?",
            source: "https://rvrnriuniversity.edu.in/contact-us/",
            last_verified: "2026-11-11",
            related_verified_faqs: [],
            top_candidates: [{ intent: "college_location", confidence: 0.91 }],
          };
        }

        if (question.toLowerCase().includes("fees")) {
          return {
            question,
            intent: "fees",
            candidate_intent: "fees",
            confidence: 0.89,
            is_unknown: false,
            college_specific: true,
            response_type: "pending_verification",
            verification_status: "PENDING_VERIFICATION",
            college_id,
            college_name: "NRI University",
            answer: "PENDING_VERIFICATION",
            source: "https://rvrnriuniversity.edu.in/admissions/",
            last_verified: "PENDING_VERIFICATION",
            related_verified_faqs: [],
            top_candidates: [{ intent: "fees", confidence: 0.89 }],
          };
        }

        return {
          question,
          intent: "unknown",
          candidate_intent: "general_queries",
          confidence: 0.14,
          is_unknown: true,
          college_specific: false,
          response_type: "unknown",
          verification_status: "NOT_APPLICABLE",
          college_id,
          college_name: college_id ? "NRI University" : null,
          answer: "Backend fallback",
          related_verified_faqs: [],
          top_candidates: [{ intent: "general_queries", confidence: 0.14 }],
        };
      },
    );

    renderWithProviders("/chat");

    // Colleges loaded via GET /api/colleges; main chat pane keeps welcome state without quick-select cards
    await waitForChatReady();
    expect(
      screen.getByText(/Welcome to Your Smart College Assistant!/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Clear Conversation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Connected • \d+ Intents/i)).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Chat History/i })[0],
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/QUICK SELECT A REGISTERED COLLEGE/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("NRI University")).not.toBeInTheDocument();

    // Send button is disabled on empty input
    const sendButton = screen.getByRole("button", { name: "Send message" });
    expect(sendButton).toBeDisabled();

    // General query succeeds without selecting a college
    const input = screen.getByLabelText("Student question input");
    await user.type(input, "Hello{enter}");
    expect(
      await screen.findByText("Hello! How can I assist you with college information today?"),
    ).toBeInTheDocument();

    // Select NRI University (college_001) via CollegeSelector dropdown
    const sidebarSelect = screen.getAllByRole("combobox", {
      name: /Select College/i,
    })[0];
    await user.click(sidebarSelect);
    const collegeListbox = await screen.findByRole("listbox");
    expect(within(collegeListbox).queryByText(/\b\d+\s+Verified\b/i)).not.toBeInTheDocument();
    expect(within(collegeListbox).queryByText(/^Pending$/i)).not.toBeInTheDocument();
    await user.click(
      within(collegeListbox).getByRole("option", { name: /NRI University/i }),
    );
    await waitFor(() => {
      expect(collegeService.selectCollege).toHaveBeenCalledWith("college_001", null);
    });

    // Verified FAQ query shows answer + readable clickable source label
    await user.type(input, "Where is the college located?{enter}");
    expect(
      await screen.findByText(
        "NRI University is located at Agiripalli, Andhra Pradesh - 521212.",
      ),
    ).toBeInTheDocument();
    const contactSourceLink = screen.getByRole("link", {
      name: "Official Contact Page",
    });
    expect(contactSourceLink).toHaveAttribute(
      "href",
      "https://rvrnriuniversity.edu.in/contact-us/",
    );
    expect(contactSourceLink).toHaveAttribute("target", "_blank");

    // Open Scoped FAQs Explorer dialog and filter Verified records
    await user.click(screen.getByRole("button", { name: /Browse College FAQs/i }));
    expect(
      await screen.findByText("NRI University — Scoped FAQ Directory"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Where is the NRI University campus located?"),
    ).toBeInTheDocument();
    const dialogContactLink = within(screen.getByRole("dialog")).getByRole("link", {
      name: "Source: Official Contact Page",
    });
    expect(dialogContactLink).toHaveAttribute(
      "href",
      "https://rvrnriuniversity.edu.in/contact-us/",
    );
    await user.click(screen.getByRole("button", { name: "Close FAQ dialog" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // PENDING_VERIFICATION query shows required verification notice
    await user.type(input, "What are the tuition fees?{enter}");
    expect(
      await screen.findByText(PENDING_VERIFICATION_MESSAGE),
    ).toBeInTheDocument();

    // Unknown query shows required helpful fallback message
    await user.type(input, "xyzzy gibberish 12345{enter}");
    expect(await screen.findByText(UNKNOWN_QUERY_MESSAGE)).toBeInTheDocument();

    // Clear Chat resets messages while keeping selected college
    await user.click(screen.getByRole("button", { name: /Clear Chat/i }));
    await waitFor(() => {
      expect(
        screen.queryByText(UNKNOWN_QUERY_MESSAGE),
      ).not.toBeInTheDocument();
    });

    // Send one message again before switching so we prove switching clears college context
    await user.type(input, "Where is the college located?{enter}");
    expect(
      await screen.findByText(
        "NRI University is located at Agiripalli, Andhra Pradesh - 521212.",
      ),
    ).toBeInTheDocument();

    // Switch college from college_001 to college_002 -> resets previous conversation!
    await user.click(
      screen.getAllByRole("combobox", { name: /Select College/i })[0],
    );
    await user.click(
      await screen.findByRole("option", {
        name: /SRM University-AP/i,
      }),
    );

    await waitFor(() => {
      expect(collegeService.selectCollege).toHaveBeenCalledWith(
        "college_002",
        "college_001",
      );
    });

    // Previous college_001 verified answer must be cleared from conversation context
    await waitFor(() => {
      expect(
        screen.queryByText(
          "NRI University is located at Agiripalli, Andhra Pradesh - 521212.",
        ),
      ).not.toBeInTheDocument();
    });
  },
  30000,
);

  it("displays API error notifications cleanly without crashing", async () => {
    const user = userEvent.setup({ delay: null });
    const sendSpy = vi
      .spyOn(chatService, "sendMessage")
      .mockRejectedValue(
        new ApiServiceError(
          "A valid college_id is required to answer college-specific queries.",
          400,
          "MISSING_COLLEGE_ID",
        ),
      );

    renderWithProviders("/chat");
    await waitForChatReady();

    const input = screen.getByLabelText("Student question input");
    await user.type(input, "What are the fees?{enter}");

    expect(
      await screen.findByText(
        "A valid college_id is required to answer college-specific queries.",
      ),
    ).toBeInTheDocument();
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(
        "Please select a college from the dropdown before asking college-specific questions.",
      ),
    ).toBeInTheDocument();
  });

  it("supports mobile navigation drawer toggle and suggested question chips", async () => {
    const user = userEvent.setup({ delay: null });
    const sendSpy = vi
      .spyOn(chatService, "sendMessage")
      .mockResolvedValue({
        question: "Hello, what can you help me with?",
        intent: "greeting",
        candidate_intent: "greeting",
        confidence: 0.94,
        is_unknown: false,
        college_specific: false,
        response_type: "general",
        verification_status: "GENERAL",
        college_id: null,
        college_name: null,
        answer: "Hi! Ask me about admissions, courses, or campus details.",
        related_verified_faqs: [],
        top_candidates: [{ intent: "greeting", confidence: 0.94 }],
      });

    renderWithProviders("/chat");
    await waitForChatReady();

    // Responsive mobile menu toggle button opens accessible temporary modal drawer
    const menuButton = screen.getByRole("button", { name: "Open navigation menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await user.click(menuButton);

    // Drawer opens with aria-expanded="true" and supports Escape via Drawer onClose={handleCloseDrawer}
    await waitFor(() => {
      expect(menuButton).toHaveAttribute("aria-expanded", "true");
    });
    const closeMenuButton = await screen.findByRole("button", {
      name: "Close navigation menu",
    });
    expect(closeMenuButton).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(menuButton).toHaveAttribute("aria-expanded", "false");
    });

    // Reopen and verify closing via mobile Close navigation menu button
    await user.click(menuButton);
    await waitFor(() => {
      expect(menuButton).toHaveAttribute("aria-expanded", "true");
    });
    await user.click(
      await screen.findByRole("button", { name: "Close navigation menu" }),
    );

    // Drawer closes cleanly so background chat panel and suggestions are interactive again
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Open navigation menu" }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    // Clicking a curated suggested question chip dispatches exactly one query
    await user.click(
      await screen.findByRole("button", { name: /What can you help with\?/i }),
    );
    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith({
        question: "Hello, what can you help me with?",
        college_id: null,
      });
    });
    expect(
      await screen.findByText(
        "Hi! Ask me about admissions, courses, or campus details.",
      ),
    ).toBeInTheDocument();
  },
  15000,
);

  it(
    "deduplicates verified answer source URLs while keeping clickable label and verification date",
    async () => {
      const user = userEvent.setup({ delay: null });
      vi.spyOn(chatService, "sendMessage").mockResolvedValue({
        question: "How can I apply for admission?",
        intent: "admissions",
        candidate_intent: "admissions",
        confidence: 0.89,
        is_unknown: false,
        college_specific: true,
        response_type: "verified_faq",
        verification_status: "VERIFIED",
        college_id: "college_001",
        college_name: "NRI University",
        answer:
          "Students can apply online using the UG/PG Online Registration Form or register for NRIUCET 2026 on the official admissions portal at https://rvrnriuniversity.edu.in/admissions/.",
        matched_question: "How can students apply for admissions at NRI University?",
        source: "https://rvrnriuniversity.edu.in/admissions/",
        last_verified: "2026-11-11",
        related_verified_faqs: [
          {
            college_id: "college_001",
            college_name: "NRI University",
            category: "admissions",
            question: "Where can students download the official NRI University Prospectus?",
            answer:
              "The official NRIU Prospectus 2026-2027 PDF is published at https://rvrnriuniversity.edu.in/wp-content/uploads/2026/03/NRIU-Prospectus-2026-2027.pdf.",
            source: "https://rvrnriuniversity.edu.in/admissions/",
            last_verified: "2026-11-11",
            verification_status: "VERIFIED",
          },
        ],
        top_candidates: [{ intent: "admissions", confidence: 0.89 }],
      });

      renderWithProviders("/chat");
      await waitForChatReady();

      const sidebarSelect = screen.getAllByRole("combobox", {
        name: /Select College/i,
      })[0];
      await user.click(sidebarSelect);
      await user.click(
        await screen.findByRole("option", { name: /NRI University/i }),
      );
      await waitFor(() => {
        expect(collegeService.selectCollege).toHaveBeenCalledWith("college_001", null);
      });

      const input = screen.getByLabelText("Student question input");
      await user.type(input, "How can I apply for admission?{enter}");

      expect(
        await screen.findByText(
          "Students can apply online using the UG/PG Online Registration Form or register for NRIUCET 2026 on the official admissions portal.",
        ),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole("main")).queryByText(
          /https:\/\/rvrnriuniversity\.edu\.in\/admissions\//,
        ),
      ).not.toBeInTheDocument();

      const admissionsSourceLink = screen.getByRole("link", {
        name: "Official Admissions Portal",
      });
      expect(admissionsSourceLink).toHaveAttribute(
        "href",
        "https://rvrnriuniversity.edu.in/admissions/",
      );
      expect(admissionsSourceLink).toHaveAttribute("target", "_blank");
      expect(screen.getByText("Last verified: 2026-11-11")).toBeInTheDocument();
      expect(screen.queryByText(/Related verified questions/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          "Where can students download the official NRI University Prospectus?",
        ),
      ).not.toBeInTheDocument();
    },
    15000,
  );

  it(
    "displays only logo and full college name in selected dropdown across all five colleges while keeping the sidebar info card",
    async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProviders("/chat");
      await waitForChatReady();

      let previousId: string | null = null;
      for (const college of MOCK_COLLEGES.colleges) {
        const sidebarCombobox = screen.getAllByRole("combobox", {
          name: /Select College/i,
        })[0];
        await user.click(sidebarCombobox);
        const listbox = await screen.findByRole("listbox");
        await user.click(
          within(listbox).getByRole("option", {
            name: new RegExp(college.college_name, "i"),
          }),
        );

        await waitFor(() => {
          expect(collegeService.selectCollege).toHaveBeenCalledWith(
            college.college_id,
            previousId,
          );
        });
        previousId = college.college_id;

        const updatedCombobox = screen.getAllByRole("combobox", {
          name: /Select College/i,
        })[0];
        // Selected dropdown shows only college logo + full college name, without location
        expect(
          within(updatedCombobox).getByText(college.college_name),
        ).toBeInTheDocument();
        expect(
          within(updatedCombobox).getByRole("img", {
            name: `${college.college_name} logo`,
          }),
        ).toHaveAttribute("src", college.logo_url);
        const locationText = college.location ?? "";
        expect(locationText).not.toBe("");
        expect(
          within(updatedCombobox).queryByText(locationText),
        ).not.toBeInTheDocument();

        // Sidebar college information card below dropdown stays intact with location, counts, sources, and FAQ button
        const nav = screen.getByRole("navigation", {
          name: /College and chat navigation/i,
        });
        expect(within(nav).getAllByText(locationText)[0]).toBeInTheDocument();
        expect(
          within(nav).getAllByText(`${college.verified_faq_count} Verified`)[0],
        ).toBeInTheDocument();
        expect(
          within(nav).getAllByText(`${college.pending_faq_count} Pending`)[0],
        ).toBeInTheDocument();
        expect(
          within(nav).getAllByRole("button", { name: /Browse College FAQs/i })[0],
        ).toBeInTheDocument();
        if (college.college_id === "college_001") {
          expect(
            (await within(nav).findAllByText("Official Sources:"))[0],
          ).toBeInTheDocument();
        }
      }
    },
    30000,
  );
});
