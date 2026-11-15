import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { AppRoutes } from "../App";
import { AdminAuthProvider } from "../contexts/AdminAuthContext";
import { CollegeProvider } from "../contexts/CollegeContext";
import { ADMIN_TOKEN_KEY, adminService } from "../services/adminService";
import { ApiServiceError } from "../services/api";
import { collegeService } from "../services/collegeService";
import theme from "../theme/theme";
import type {
  AdminFAQListResponse,
  AdminLoginResponse,
  AdminOverviewStats,
  AdminUser,
} from "../types/admin";
import type { CollegeListResponse } from "../types/api";

const MOCK_ADMIN_USER: AdminUser = {
  username: "test_admin",
  role: "admin",
};

const MOCK_LOGIN_RESPONSE: AdminLoginResponse = {
  access_token: "test.admin.jwt.token",
  token_type: "bearer",
  expires_in: 1440,
  username: "test_admin",
};

const MOCK_OVERVIEW_STATS: AdminOverviewStats = {
  total_colleges: 5,
  total_faqs: 150,
  verified_faqs: 117,
  pending_faqs: 33,
  total_queries: 0,
  colleges: [
    {
      college_id: "college_001",
      college_name: "NRI University",
      short_code: "NRIU",
      location: "Agiripalli, Vijayawada Rural",
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
      short_code: "SRMAP",
      location: "Neerukonda, Mangalagiri",
      logo_url: "/logos/college_002.png",
      is_primary_profile: false,
      profile_status: "VERIFIED",
      verified_faq_count: 23,
      pending_faq_count: 7,
      last_verified: "2026-11-12",
    },
  ],
};

const MOCK_COLLEGES: CollegeListResponse = {
  total_colleges: 2,
  colleges: MOCK_OVERVIEW_STATS.colleges,
};

const MOCK_FAQS: AdminFAQListResponse = {
  total_records: 2,
  verified_count: 1,
  pending_count: 1,
  faqs: [
    {
      id: 1,
      college_id: "college_001",
      college_name: "NRI University",
      category: "admissions",
      question: "How can I apply for admission to NRI University?",
      answer: "Candidates can apply through the official NRIUCET counseling portal.",
      source: "https://rvrnriuniversity.edu.in/admissions/",
      last_verified: "2026-11-11",
      verification_status: "VERIFIED",
    },
    {
      id: 2,
      college_id: "college_001",
      college_name: "NRI University",
      category: "fees",
      question: "What are the tuition fees for BTech at NRI University?",
      answer: "Tuition fees are pending official notification for the 2026 academic year.",
      source: "PENDING_VERIFICATION",
      last_verified: "2026-11-11",
      verification_status: "PENDING_VERIFICATION",
    },
  ],
};

function renderAdminApp(initialPath = "/admin/login") {
  return render(
    <ThemeProvider theme={theme}>
      <AdminAuthProvider>
        <CollegeProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <AppRoutes />
          </MemoryRouter>
        </CollegeProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}

describe("SmartCollege AI Admin Dashboard Frontend", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Default mock for public collegeService to avoid errors on Landing/Chat
    vi.spyOn(collegeService, "listColleges").mockResolvedValue(MOCK_COLLEGES);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("redirects unauthenticated users attempting to access /admin to /admin/login", async () => {
    renderAdminApp("/admin");

    await waitFor(() => {
      expect(screen.getByText("Administrator Sign In")).toBeInTheDocument();
    });
    expect(screen.getByText(/access the smartcollege ai institutional console/i)).toBeInTheDocument();
  });

  it("handles failed login attempts with appropriate error message", async () => {
    const user = userEvent.setup();
    vi.spyOn(adminService, "login").mockRejectedValue(
      new ApiServiceError("Invalid administrator credentials.", 401, "UNAUTHORIZED")
    );

    renderAdminApp("/admin/login");

    await waitFor(() => {
      expect(screen.getByText("Administrator Sign In")).toBeInTheDocument();
    });

    const userInput = screen.getByLabelText(/administrator username/i);
    const passInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in to dashboard/i });

    await user.type(userInput, "wrong_admin");
    await user.type(passInput, "wrong_password");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("admin-login-error")).toBeInTheDocument();
    });
    expect(screen.getByText(/invalid administrator credentials/i)).toBeInTheDocument();
  });

  it("authenticates admin successfully and loads dashboard overview stats", async () => {
    const user = userEvent.setup();
    vi.spyOn(adminService, "login").mockResolvedValue(MOCK_LOGIN_RESPONSE);
    vi.spyOn(adminService, "getOverviewStats").mockResolvedValue(MOCK_OVERVIEW_STATS);
    vi.spyOn(adminService, "getMe").mockResolvedValue(MOCK_ADMIN_USER);

    renderAdminApp("/admin/login");

    await waitFor(() => {
      expect(screen.getByText("Administrator Sign In")).toBeInTheDocument();
    });

    const userInput = screen.getByLabelText(/administrator username/i);
    const passInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in to dashboard/i });

    await user.type(userInput, "test_admin");
    await user.type(passInput, "TestPassword2026!");
    await user.click(submitBtn);

    // Navigates to /admin Overview
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    expect(screen.getByText("test_admin (admin)")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument(); // Total FAQs
    expect(screen.getByText("117")).toBeInTheDocument(); // Verified FAQs
    expect(screen.getByText("33")).toBeInTheDocument();  // Pending FAQs
  });

  it("handles already-stored active admin sessions and supports sign out", async () => {
    const user = userEvent.setup();
    localStorage.setItem(ADMIN_TOKEN_KEY, "existing.valid.token");
    vi.spyOn(adminService, "getMe").mockResolvedValue(MOCK_ADMIN_USER);
    vi.spyOn(adminService, "getOverviewStats").mockResolvedValue(MOCK_OVERVIEW_STATS);
    const logoutSpy = vi.spyOn(adminService, "logout").mockResolvedValue();

    renderAdminApp("/admin");

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    // Trigger Sign Out
    const signOutBtn = screen.getAllByRole("button", { name: /sign out/i })[0];
    await user.click(signOutBtn);

    // Dialog confirmation
    await waitFor(() => {
      expect(screen.getByText("Confirm Sign Out")).toBeInTheDocument();
    });

    const dialog = screen.getByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: "Sign Out" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
      expect(screen.getByText("Administrator Sign In")).toBeInTheDocument();
    });

    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
  });

  it("handles expired tokens gracefully by redirecting to login", async () => {
    localStorage.setItem(ADMIN_TOKEN_KEY, "expired.token");
    vi.spyOn(adminService, "getMe").mockRejectedValue(
      new ApiServiceError("Token expired or revoked.", 401, "UNAUTHORIZED")
    );

    renderAdminApp("/admin");

    await waitFor(() => {
      expect(screen.getByText("Administrator Sign In")).toBeInTheDocument();
    });
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
  });

  it(
    "manages college profiles: list, search, and dialog opening",
    async () => {
      const user = userEvent.setup();
      localStorage.setItem(ADMIN_TOKEN_KEY, "valid.token");
      vi.spyOn(adminService, "getMe").mockResolvedValue(MOCK_ADMIN_USER);
      vi.spyOn(adminService, "listColleges").mockResolvedValue(MOCK_COLLEGES);

      renderAdminApp("/admin/colleges");

      await waitFor(() => {
        expect(screen.getByText("College Profiles")).toBeInTheDocument();
      });

      expect(screen.getByText("NRI University")).toBeInTheDocument();
      expect(screen.getByText("SRM University-AP")).toBeInTheDocument();

      // Search filter
      const searchInput = screen.getByPlaceholderText(/search colleges by name/i);
      await user.type(searchInput, "SRM");

      await waitFor(() => {
        expect(screen.getByText("SRM University-AP")).toBeInTheDocument();
        expect(screen.queryByText("NRI University")).not.toBeInTheDocument();
      });

      // Open Add Dialog
      const addBtn = screen.getByTestId("admin-add-college-button");
      await user.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText("Register New College Profile")).toBeInTheDocument();
      });
    },
    25000
  );

  it(
    "manages FAQs: list, filter, toggle verification, and dialog opening",
    async () => {
      const user = userEvent.setup();
      localStorage.setItem(ADMIN_TOKEN_KEY, "valid.token");
      vi.spyOn(adminService, "getMe").mockResolvedValue(MOCK_ADMIN_USER);
      vi.spyOn(adminService, "listFAQs").mockResolvedValue(MOCK_FAQS);
      vi.spyOn(adminService, "listColleges").mockResolvedValue(MOCK_COLLEGES);

      const toggleSpy = vi.spyOn(adminService, "updateFAQVerification").mockResolvedValue({
        ...MOCK_FAQS.faqs[1],
        verification_status: "VERIFIED",
      });

      renderAdminApp("/admin/faqs");

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "FAQ Management" })).toBeInTheDocument();
      });

      expect(screen.getByText(/how can i apply for admission/i)).toBeInTheDocument();
      expect(screen.getByText(/what are the tuition fees for btech/i)).toBeInTheDocument();

      // Toggle Pending to Verified on FAQ #2
      const pendingChip = screen.getByText("PENDING");
      await user.click(pendingChip);

      await waitFor(() => {
        expect(toggleSpy).toHaveBeenCalledWith(2, "VERIFIED");
      });

      // Open Add FAQ Dialog
      const addFaqBtn = screen.getByTestId("admin-add-faq-button");
      await user.click(addFaqBtn);

      await waitFor(() => {
        expect(screen.getByText("Create New College FAQ")).toBeInTheDocument();
      });
    },
    25000
  );
});
