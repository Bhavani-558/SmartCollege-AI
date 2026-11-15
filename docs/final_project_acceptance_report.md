# Final Project Acceptance Audit Report

**Project:** AI-Powered Multi-College Chatbot for Student Queries (`SmartCollege AI`)  
**Audit Date:** `2026-11-12`  
**Audit Mode:** **Strict Read-Only Acceptance Audit** (zero existing files modified, zero features added, trained NLP artifacts untouched)  
**Final Status:** **ACCEPTED**

---

## 1. Executive Acceptance Checklist

| Acceptance Criterion | Status | Observed Evidence |
| :--- | :---: | :--- |
| **Five-College Integration** | **PASS** | `5` colleges integrated cleanly under `college_001`–`college_005` (`NRIU`, `SRMAP`, `KLU`, `SAHE`, `PVPSIT`) in [colleges.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/colleges.json) |
| **Exact FAQ Record Count** | **PASS** | **`150`** records (`30` per institution) in [college_faq.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/college_faq.json), matching `college_faq_schema_record_count = 150` in [dataset_summary.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/dataset_summary.json) |
| **Verification Split** | **PASS** | **`117 VERIFIED`** + **`33 PENDING_VERIFICATION`** + `0` other statuses (`15/15`, `23/7`, `28/2`, `25/5`, `26/4`) |
| **Zero Cross-College Leakage** | **PASS** | `0` duplicate `(college_id, question)` pairs, `0` `college_name` mismatches, `0` cross-domain `source` leaks, strict `college_id` guard in `ChatbotService.process_query`, and `test_strict_cross_college_isolation_and_sahe_pvpsit_separation` passed |
| **Pending Information Isolation** | **PASS** | `0` `VERIFIED` FAQs embed `"PENDING_VERIFICATION"`, all `33` `PENDING_VERIFICATION` FAQs retain explicit `"PENDING_VERIFICATION"` markers, and `ChatbotService._build_pending_response` returns `verification_status="PENDING_VERIFICATION"` notices without fabricating missing facts |
| **Backend & Frontend Test Suites** | **PASS** | Backend `pytest`: **`38 passed`** (`0` failed/skipped); Frontend TypeScript `tsc --noEmit`: **`0` errors**; Frontend Vitest: **`2` files / `7` tests passed** |
| **Trained NLP Model Unchanged** | **PASS** | `intent_classifier.joblib`, `tfidf_vectorizer.joblib`, `model_metadata.json` (`mtime 2026-11-11 12:08:59`) and `student_intents.json` (`mtime 2026-11-11 11:16:28`) remain byte-identical to pre-integration training |
| **Application Startup & Live APIs** | **PASS** | FastAPI (`uvicorn`) and React production bundle (`vite preview`) both start cleanly, serve `HTTP 200`, report all `5` colleges with exact FAQ counts, and answer live `/api/chat` queries per college |

---

## 2. System Architecture

### 2.1 End-to-End Component Stack

1. **Processed Knowledge & Intent Layer (`dataset/processed/`):**
   - [colleges.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/colleges.json): Structured institutional profiles for `college_001`–`college_005` (`official_sources`, `supported_categories`, `verified_fields`, `institutional_data`, logo paths).
   - [college_faq.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/college_faq.json): `150` college-scoped FAQ records (`30` each) tagged with `category`, `source`, `last_verified`, and `verification_status` (`VERIFIED` | `PENDING_VERIFICATION`).
   - [student_intents.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/student_intents.json): `30` intent classes (`367` training samples) split into general conversational intents and college-specific intents.
   - [dataset_summary.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/dataset_summary.json): Consolidated summary counts (`150` schema records) and pending information categories.

2. **NLP Intent Classification Engine (`backend/app/models/`, [intent_classifier.py](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/services/intent_classifier.py)):**
   - **Pipeline:** `TfidfVectorizer` (`lowercase=true`, `analyzer="char_wb"`, `ngram_range=[3, 5]`, `sublinear_tf=true`) paired with `LogisticRegression` (`C=10.0`, `max_iter=1000`, `random_state=42`).
   - **Confidence Gating:** `DEFAULT_CONFIDENCE_THRESHOLD = 0.25`; predictions below threshold return `intent="unknown"` (`is_unknown=true`) alongside `top_candidates` (`top_k=3`) instead of guessing.
   - **Model Integrity Verification (Observed `2026-11-12`):**

| Artifact | Size | Last Modified | SHA-256 Prefix |
| :--- | ---: | :--- | :--- |
| [intent_classifier.joblib](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/models/intent_classifier.joblib) | `599,159 B` | `2026-11-11 12:08:59` | `655350a73086db8c` |
| [tfidf_vectorizer.joblib](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/models/tfidf_vectorizer.joblib) | `45,203 B` | `2026-11-11 12:08:59` | `ff7e10e1c8b1a083` |
| [model_metadata.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/models/model_metadata.json) | `17,447 B` | `2026-11-11 12:08:59` | `b85c746f6c91c03b` |
| [student_intents.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/student_intents.json) | `22,328 B` | `2026-11-11 11:16:28` | `83979bcfa0f7c7b9` |

3. **FastAPI Backend & Dual Storage Layer (`backend/app/`):**
   - **Configuration ([config.py](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/utils/config.py)):** FastAPI `1.0.0`, default runtime `faq_backend="json"` (`JsonDataStore`), with prepared SQLAlchemy PostgreSQL backend (`PostgresDataStore` in [postgres_repository.py](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/services/postgres_repository.py)) using normalized `colleges` and `college_faqs` tables scoped by `(college_id, category)`.
   - **Orchestration ([chatbot_service.py](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/services/chatbot_service.py)):** `ChatbotService` handles college selection/switching (`context_reset=True`), general replies (`response_type="general"`), unknown low-confidence queries (`response_type="unknown"`), verified FAQ retrieval ranked strictly within one `(college_id, category)` slice (`response_type="verified_faq"`), and explicit pending notices (`response_type="pending_verification"`). Raises `EmptyQuestionError`, `MissingCollegeError` (`400`), or invalid `college_id` (`404`) via [schemas.py](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/utils/schemas.py) error models.
   - **REST API Endpoints:**
     - [health.py](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/routes/health.py): `GET /`, `GET /health`
     - [colleges.py](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/routes/colleges.py): `GET /api/colleges`, `POST /api/colleges/select`, `GET /api/colleges/{college_id}`, `GET /api/colleges/{college_id}/faqs`
     - [chat.py](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/backend/app/routes/chat.py): `POST /api/chat`

4. **React + TypeScript + MUI Frontend (`frontend/src/`):**
   - **Stack ([package.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/package.json)):** React `18.3.1`, TypeScript `5.6.3`, Material UI (`@mui/material` `6.1.6`), React Router DOM `6.28.0`, Axios `1.7.7`, Vite `5.4.10`, Vitest `2.1.4`.
   - **Routing & State:** [App.tsx](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/App.tsx) wraps `LandingPage` (`/`) and `ChatPage` (`/chat`) inside MUI `ThemeProvider` and [CollegeContext.tsx](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/contexts/CollegeContext.tsx), which guards against stale out-of-order college switches using `activeSelectRequestRef`.

---

## 3. Implemented Features

- **Landing Page & Direct College Launch ([LandingPage.tsx](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/pages/LandingPage.tsx)):** Branded `SmartCollege AI` hero, feature highlights, and clickable college cards displaying institutional logos (`frontend/public/logos/college_001.png`–`college_005.png`) and verified/pending counts that pre-select the college and route into `/chat`.
- **College Selection, Switching & Context Isolation ([CollegeContext.tsx](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/contexts/CollegeContext.tsx), [Sidebar.tsx](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/components/Sidebar.tsx), [CollegeSelector.tsx](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/components/CollegeSelector.tsx)):** Interactive switching between all `5` colleges and General Assistant mode with automatic conversation reset notices and backend `college_id` scoping.
- **Verified Answer Presentation & Source Deduplication ([MessageBubble.tsx](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/components/MessageBubble.tsx), [formatters.ts](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/utils/formatters.ts)):**
  - Status badges (`VERIFIED FAQ`, `PENDING VERIFICATION`, `Needs Clarification`), formatted intent category chip, and confidence percentage badge.
  - `cleanVerifiedAnswerText` strips duplicate inline source URLs when the same URL appears in the dedicated `Source:` footer, while `formatSourceLabel` displays readable labels (e.g., `"Official Admissions Portal"`, `"Official Prospectus Document (PDF)"`) hyperlinked to the exact official URL alongside `Last verified` dates and up to `3` clickable `Related verified questions` chips.
- **College FAQ Browser Modal ([ChatWindow.tsx](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/components/ChatWindow.tsx)):** Tabbed modal filtering `ALL`, `VERIFIED`, and `PENDING_VERIFICATION` FAQs for the active college, with clickable source links and verified/pending badges.
- **Responsive Navigation & Error Handling ([MainLayout.tsx](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/layouts/MainLayout.tsx), [Sidebar.tsx](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/frontend/src/components/Sidebar.tsx)):** Accessible mobile drawer toggle (`aria-expanded`, `Close navigation menu`), suggested question chips, and dismissible API error banners.

---

## 4. Five-College Dataset Summary & Isolation Verification

Observed directly from [colleges.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/colleges.json) and [college_faq.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/college_faq.json) after all corrections documented in [five_college_correction_report.md](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/docs/five_college_correction_report.md):

| `college_id` | Short Code | Official Institution Name | Total FAQs | `VERIFIED` | `PENDING_VERIFICATION` | Official Sources |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: |
| `college_001` | `NRIU` | NRI University (`Dr. RVR NRI Institute of Technology`) | 30 | 15 | 15 | 3 |
| `college_002` | `SRMAP` | SRM University-AP | 30 | 23 | 7 | 18 |
| `college_003` | `KLU` | KL Deemed to be University | 30 | 28 | 2 | 18 |
| `college_004` | `SAHE` | Siddhartha Academy of Higher Education | 30 | 25 | 5 | 18 |
| `college_005` | `PVPSIT` | Prasad V Potluri Siddhartha Institute of Technology | 30 | 26 | 4 | 13 |
| **Total** | **5 Colleges** | — | **150** | **117** | **33** | **70 unique URLs (`60` FAQ sources)** |

### Integrity Checks Confirmed Directly
- **Duplicate `(college_id, question)` pairs:** `0`
- **`college_name` vs. `colleges.json` mismatches:** `0`
- **Cross-college domain leaks across FAQ `source` fields:** `0` (all URLs belong exclusively to `nriuniversity.in` / `rvrnriuniversity.edu.in`, `srmap.edu.in`, `kluniversity.in`, `siddhartha.edu.in`, and `pvpsiddhartha.ac.in`, respectively)
- **Pending/Verified Boundary:** `0` `VERIFIED` records embed `"PENDING_VERIFICATION"`, and all `33` `PENDING_VERIFICATION` records explicitly carry `"PENDING_VERIFICATION"` in `answer`.
- **Audit & Correction Closure:** All high, medium, and low items raised in [five_college_data_audit_report.md](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/docs/five_college_data_audit_report.md) were resolved and verified in [five_college_correction_report.md](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/docs/five_college_correction_report.md).

---

## 5. Verification, Test & Startup Results (Observed in This Audit)

| Check | Exact Command / Scope | Observed Result |
| :--- | :--- | :--- |
| **Backend Pytest Suite** | `python -m pytest -v AI-Student-Chatbot/backend/tests` (`test_chat_api.py`, `test_colleges_api.py`, `test_intent_prediction.py`) | **`38 passed, 72 warnings in 1.12s`** (`0` failed, `0` skipped) |
| **Frontend TypeScript Check** | `cd AI-Student-Chatbot/frontend; npx tsc --noEmit` | **Passed** (`exit 0`, `0` TypeScript errors) |
| **Frontend Test Suite** | `npm test -- --run` (`apiAndUtils.test.ts` + `App.test.tsx`) | **`Test Files 2 passed (2)`**, **`Tests 7 passed (7)`** in `45.07s` |
| **Production Build** | `npm run build` (`tsc -b && vite build`, observed in [five_college_correction_report.md](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/docs/five_college_correction_report.md#L121)) | **Passed** (`1025` modules transformed, built cleanly into `dist/`) |
| **Live Full-Stack Startup Probe** | `uvicorn backend.app.main:app` (`127.0.0.1:8011`) + `vite preview` (`127.0.0.1:4174`) | **Passed (`exit 0`)**: `FRONTEND OK: 200`, `COLLEGES COUNT: 5` (`15/15`, `23/7`, `28/2`, `25/5`, `26/4`), and verified `/api/chat` responses for `college_001`–`college_005` |
| **Dataset Audit Script** | `audit_check.py` + domain isolation check on processed JSON files | **Passed (`exit 0`)**: `colleges: 5`, `faqs: 150`, `VERIFIED: 117`, `PENDING_VERIFICATION: 33`, `name_mismatches: 0`, `pending_marker_issues: 0`, `DUP_Q: 0` |
| **Live Source URLs (`70 / 70`)** | Observed post-final-edit run in [five_college_correction_report.md](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/docs/five_college_correction_report.md#L118) | **Passed (`70 / 70 HTTP 200 OK`)** |

---

## 6. Known Limitations & Remaining Work

1. **Unpublished Institutional Data (`33` `PENDING_VERIFICATION` FAQs):**
   - `college_001` (`NRIU`): `15` institutional categories (fees, scholarships, hostel, HODs, exams, placements, internships, library, facilities, sports, admission documents, seat intake, principal/VC directory, anti-ragging `#29`, mess/bus timetable `#30`) remain unverified on `nriuniversity.in` / `rvrnriuniversity.edu.in`.
   - `college_002` (`SRMAP`): `7` pending topics (admission documents, seat intake, syllabus PDFs, exam schedule, itemized domestic M.Tech/MBA fees, domestic B.Tech scholarship tiers due to `404` / 2021-archived scholarship sub-pages, hostel/mess fees); public SEAS B.Tech tuition page omits an academic year header and retains a hidden responsive legacy fee HTML block alongside the visible table.
   - `college_003` (`KLU`): `2` pending topics (branch-wise seat intake, department semester syllabus PDFs); overall placement metrics from `cb2.pdf` (`Rs. 81 LPA` highest, `Rs. 7.25 LPA` median) omit an explicit batch reporting year.
   - `college_004` (`SAHE`): `5` pending topics (overall average CTC / consolidated placement percentage with `'0'` static top-banner counters, admission document checklist, internship stipends/mandatory rules, hostel/mess fees).
   - `college_005` (`PVPSIT`): `4` pending topics (unpublished `2026–27` Category-A/B fee circular vs. published `2024–25` Mandatory Disclosure fees, admission reporting certificates, internship stipends, annual hostel/mess fee table, plus unpublished bus timetables).
2. **Runtime & Environment Configuration:**
   - Default runtime uses `FAQ_BACKEND=json`; `PostgresDataStore` is implemented and tested against SQLAlchemy schema/sync (`test_prepared_sql_repository_sync_and_isolation`), while live PostgreSQL deployment requires provisioning PostgreSQL and configuring `FAQ_BACKEND=postgres` and `DATABASE_URL` in `backend/.env`.
   - Windows workspace requires non-sandboxed execution for loopback socket servers/probes (`uvicorn` `ProactorEventLoop` / `127.0.0.1` ports).
3. **Model & Dependency Observations:**
   - Pre-trained TF-IDF + Logistic Regression model (`91.89%` holdout accuracy / `91.28%` 5-fold CV mean across `30` classes, `74` test samples) recorded `6` holdout misclassifications on short ambiguous phrases (`"college dress code"`, `"have a good day"`, `"working days"`, `"i am leaving"`, `"seat allotment"`, `"is anyone there"`).
   - `pytest` logs `72` upstream deprecation warnings (`asyncio.iscoroutinefunction` in FastAPI/Starlette under Python `3.14.3` and NumPy `2.5.1` array shape deprecation in `joblib`), and Vitest logs React Router v6 future-flag warnings; none cause functional failures.

