# Frontend Implementation Report

**Project:** AI-Powered Multi-College Chatbot for Student Queries  
**Phase:** Phase 3 — React Frontend & Live Backend Integration  
**Status:** Completed, Verified End-to-End, and Built for Production

---

## 1. Frontend Architecture & Directory Structure

The frontend resides inside `frontend/` and is organized around clear separation of API services, shared college state, chat session state, reusable Material UI components, layout navigation, and route pages.

```text
frontend/
├── .env
├── .env.example
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── __tests__/
    │   ├── App.test.tsx
    │   └── apiAndUtils.test.ts
    ├── assets/
    │   └── logo.svg
    ├── components/
    │   ├── ChatWindow.tsx
    │   ├── CollegeSelector.tsx
    │   ├── LoadingIndicator.tsx
    │   ├── MessageBubble.tsx
    │   ├── MessageInput.tsx
    │   ├── Sidebar.tsx
    │   └── SuggestedQuestions.tsx
    ├── contexts/
    │   └── CollegeContext.tsx
    ├── hooks/
    │   └── useChatSession.ts
    ├── layouts/
    │   └── MainLayout.tsx
    ├── pages/
    │   ├── ChatPage.tsx
    │   └── LandingPage.tsx
    ├── services/
    │   ├── api.ts
    │   ├── chatService.ts
    │   └── collegeService.ts
    ├── theme/
    │   └── theme.ts
    ├── types/
    │   ├── api.ts
    │   └── chat.ts
    ├── utils/
    │   ├── constants.ts
    │   └── formatters.ts
    ├── App.tsx
    ├── index.css
    ├── main.tsx
    ├── setupTests.ts
    └── vite-env.d.ts
```

---

## 2. Technology Stack

- **UI Framework:** React `^18.3.1`, React DOM `^18.3.1`
- **Build & Tooling:** Vite `^5.4.10`, TypeScript `^5.6.3`
- **Component Library & Styling:** Material UI (`@mui/material ^6.1.6`, `@mui/icons-material ^6.1.6`, Emotion `@emotion/react`, `@emotion/styled`), custom theme tokens (`src/theme/theme.ts`), global CSS animations (`src/index.css`)
- **HTTP Client:** Axios `^1.7.7` configured via `VITE_API_BASE_URL`
- **Routing:** React Router (`react-router-dom ^6.28.0`)
- **Frontend Testing:** Vitest `^2.1.4`, React Testing Library (`@testing-library/react ^16.0.1`, `@testing-library/user-event ^14.5.2`, `@testing-library/jest-dom ^6.6.3`), `jsdom`

---

## 3. Implemented Pages & Components

### Pages & Layout
- **[`LandingPage`](../frontend/src/pages/LandingPage.tsx) (`/`):** Brand header with custom SVG logo (`logo.svg`), hero section titled **"Your Smart College Assistant"**, primary **Get Started** CTA navigating to `/chat`, 4 feature cards (**Multi-College Support**, **AI-Based Intent Recognition**, **Instant Student Query Responses**, **College-Specific Information**), and interactive preview cards for registered colleges loaded live from `GET /api/colleges`.
- **[`ChatPage`](../frontend/src/pages/ChatPage.tsx) (`/chat`) & [`MainLayout`](../frontend/src/layouts/MainLayout.tsx):** Responsive workspace combining a permanent desktop drawer (`md+`), collapsible modal mobile drawer (`<md`) with `aria-expanded` and explicit **Close navigation menu** accessibility button, mobile app bar, and full-height chat viewport.

### Core Components & State
- **[`CollegeContext`](../frontend/src/contexts/CollegeContext.tsx) & [`CollegeSelector`](../frontend/src/components/CollegeSelector.tsx):** Loads registered colleges (`GET /api/colleges`) and backend status (`GET /health`). Switching or selecting a college calls `POST /api/colleges/select`, fetches scoped `GET /api/colleges/{college_id}` and `GET /api/colleges/{college_id}/faqs`, guards against stale out-of-order responses, and increments `contextVersion` to reset college-specific conversation history cleanly.
- **[`useChatSession`](../frontend/src/hooks/useChatSession.ts):** Manages session conversation messages, timestamps, loading indicator state, conversation reset on college switch, and response mapping for `verified_faq`, `pending_verification`, `unknown`, `general`, and API errors.
- **[`Sidebar`](../frontend/src/components/Sidebar.tsx):** Displays navigation links, active `CollegeSelector`, college verification summary (only rendering verified metadata; explicitly flagging `college_002` and `college_003` as `PENDING_VERIFICATION` templates), official source links, **Browse College FAQs** launcher, **Clear Conversation** action, and live backend health status indicator.
- **[`ChatWindow`](../frontend/src/components/ChatWindow.tsx):** Header status bar, dismissible error alerts (with retry and quick-select helper when `MISSING_COLLEGE_ID` occurs), quick-select college cards in initial general view, auto-scrolling message pane, scoped **College FAQ Directory** dialog with `All` / `Verified` / `Pending` filter tabs and clickable **Ask in Chat** buttons, `SuggestedQuestions`, and `MessageInput`.
- **[`MessageBubble`](../frontend/src/components/MessageBubble.tsx):** Right-aligned student gradient bubbles, left-aligned assistant cards with verification badges (`VERIFIED FAQ`, `PENDING VERIFICATION`, `Needs Clarification`), confidence badges, category chips, clickable official URLs/emails (`splitTextWithLinks`), clickable `source` attribution + `last_verified` date, and related verified question follow-ups.
- **[`SuggestedQuestions`](../frontend/src/components/SuggestedQuestions.tsx), [`MessageInput`](../frontend/src/components/MessageInput.tsx), [`LoadingIndicator`](../frontend/src/components/LoadingIndicator.tsx):** Horizontal suggested-question chips aligned with backend intents, Enter-to-send composer (disabled for empty/whitespace inputs and while awaiting a reply), and animated typing indicator.

---

## 4. API Integration Details

Centralized in [`api.ts`](../frontend/src/services/api.ts), [`collegeService.ts`](../frontend/src/services/collegeService.ts), and [`chatService.ts`](../frontend/src/services/chatService.ts) using exact schemas defined in [`schemas.py`](../backend/app/utils/schemas.py):

- **Environment Variable:** `VITE_API_BASE_URL` (documented in [`.env.example`](../frontend/.env.example), defaulting to `http://127.0.0.1:8000`).
- **Integrated Endpoints:**
  - `GET /health`
  - `GET /api/colleges`
  - `POST /api/colleges/select` (`{ college_id, previous_college_id }`)
  - `GET /api/colleges/{college_id}`
  - `GET /api/colleges/{college_id}/faqs`
  - `POST /api/chat` (`{ question, college_id }`)
- **UI Response Handling:**
  - **`VERIFIED` FAQ (`response_type = "verified_faq"`):** Displays exact backend answer, clickable official `source` URL, `last_verified`, category, confidence, and related verified questions.
  - **`PENDING_VERIFICATION` (`response_type = "pending_verification"`):** Displays `"This information is currently being verified by the college. Please contact the college administration for confirmation."` along with college/category status context without fabricating facts.
  - **`UNKNOWN` (`response_type = "unknown"`):** Displays `"Sorry, I couldn't understand your question. Please try asking in a different way."`
  - **`GENERAL` (`response_type = "general"`):** Supports greetings and general queries without requiring college selection.
  - **API Errors (`400 EMPTY_QUESTION`, `400 MISSING_COLLEGE_ID`, `404 INVALID_COLLEGE_ID`, `NETWORK_ERROR`):** Normalized via [`normalizeApiError`](../frontend/src/services/api.ts) into structured `ApiServiceError` instances rendered via non-crashing Alerts and inline guidance.

---

## 5. Multi-College Functionality & Strict Isolation

- Verified `college_001` (**NRI University**), `college_002` (**Partner College Profile 2 (Template)**), and `college_003` (**Partner College Profile 3 (Template)**) all use the same shared backend NLP intent classifier.
- Every college-specific request passes the active `selectedCollegeId` to `POST /api/chat`.
- Switching colleges via `CollegeSelector` calls `POST /api/colleges/select`, updates `collegeDetail` and `collegeFaqs` strictly for the new `college_id`, and resets prior chat history so answers from one college never appear under another college.

---

## 6. Testing & Verification Results

### A. Frontend Unit & Component Tests (`Vitest` + React Testing Library)
Command: `npm --prefix AI-Student-Chatbot/frontend test` (`vitest run`)
- **Result:** **6 passed, 0 failed** across **2 test files** (`50.06s`):
  - `src/__tests__/apiAndUtils.test.ts`: **2 passed** (category label/confidence/URL/email link parsing; FastAPI `ErrorResponse` & network error normalization).
  - `src/__tests__/App.test.tsx`: **4 passed** (landing page & Get Started navigation; college loading, general/VERIFIED/PENDING_VERIFICATION/UNKNOWN flows, Scoped FAQ Directory dialog, Clear Chat, and context reset on `college_001 -> college_002` switch; `MISSING_COLLEGE_ID` error handling; accessible mobile navigation drawer open/close toggle via Escape/`Drawer onClose={handleCloseDrawer}` and **Close navigation menu** button without weakening WAI-ARIA `aria-hidden` behavior + single-dispatch suggested question chip submission verified via `toHaveBeenCalledTimes(1)`).

### B. Live Full-Stack Headless Chrome End-to-End Verification
Executed live against running FastAPI (`uvicorn` on `http://127.0.0.1:8000`) and Vite (`http://127.0.0.1:5173`) via headless Chrome DevTools (`browser_e2e.mjs`):
1. Desktop landing page (`1280x800`) loaded with zero horizontal overflow and navigated via **Get Started** to `/chat`.
2. `/health` (`Connected • 30 Intents`) and `GET /api/colleges` (`college_001`, `college_002`, `college_003`) verified live.
3. General query (`"Hello"`) succeeded without selecting a college.
4. Selecting `college_001` (`NRI University`) and querying campus location returned `VERIFIED` answer (`Agiripalli`) and official source URL (`https://rvrnriuniversity.edu.in/contact-us/`).
5. Querying fees returned the `PENDING_VERIFICATION` notice without fabricated fee figures.
6. Out-of-domain input returned the `UNKNOWN` guidance message.
7. Switching to `college_002` cleared previous `college_001` answers and returned `PENDING_VERIFICATION` for location with zero cross-college leakage.
8. Clearing college selection and asking a college-specific question triggered `400 MISSING_COLLEGE_ID` and rendered actionable UI guidance cleanly.
9. Mobile responsive viewport (`390x844`): hamburger navigation button visible, temporary drawer opens (`aria-expanded="true"`) with a single brand header (`1` logo, `1` title, `1` subtitle) and closes via **Close navigation menu** (`aria-expanded="false"`), zero horizontal overflow (`scrollWidth = 390`, `innerWidth = 390`).
10. Browser diagnostics: **0 runtime exceptions**, **0 console errors** (`Console errors: []`).

### C. Backend Regression Verification (`pytest`)
Command: `python -m pytest -v AI-Student-Chatbot/backend/tests`
- **Result:** **33 passed, 72 warnings in 0.71s** (0 failed, 0 skipped), confirming Phase 2 backend functionality, NLP intent classification, and dataset integrity remain intact.

---

## 7. Production Build Results

Command: `npm --prefix AI-Student-Chatbot/frontend run build` (`tsc -b && vite build`)
- **TypeScript (`tsc -b`):** Passed cleanly with `0` errors.
- **Vite Production Build (`dist/`):** `✓ 1023 modules transformed`, built in `23.60s` with zero bundle warnings:
  - `dist/index.html`: `0.72 kB` (gzip `0.39 kB`)
  - `dist/assets/index-DRo9xAHx.css`: `0.94 kB` (gzip `0.53 kB`)
  - `dist/assets/index-CVpAv3FN.js`: `103.05 kB` (gzip `34.76 kB`)
  - `dist/assets/react-vendor-CsbsnS60.js`: `159.83 kB` (gzip `52.17 kB`)
  - `dist/assets/mui-vendor-DXVMrZ7n.js`: `315.35 kB` (gzip `96.82 kB`)

---

## 8. Commands to Run Backend & Frontend

### Start FastAPI Backend (from `d:\TechGlobal_Mini\AI-Student-Chatbot`)
```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Docs: `http://127.0.0.1:8000/docs`

### Start React Frontend (from `d:\TechGlobal_Mini\AI-Student-Chatbot\frontend`)
```powershell
npm install
npm run dev
```
- Frontend URL: `http://127.0.0.1:5173`
- Production Build: `npm run build`
- Frontend Tests: `npm test`

---

## 9. Known Limitations & Notes

- `college_002` and `college_003` remain `PENDING_VERIFICATION` template profiles intentionally until verified institutional records are collected and added to `dataset/processed/colleges.json` and `dataset/processed/college_faq.json`.
- Conversation history is session-scoped in memory on the frontend and intentionally resets when clearing chat or switching colleges to avoid mixing multi-college contexts.
- On Windows under restricted network-isolated sandboxes, local socket binding (`uvicorn` / Vite loopback checks) requires standard host/network permission.

