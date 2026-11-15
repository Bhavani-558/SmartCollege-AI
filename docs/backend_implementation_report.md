# FastAPI Backend Implementation Report

**Project:** AI-Powered Multi-College Chatbot for Student Queries  
**Phase:** Phase 2 — FastAPI Backend  
**Status:** Completed and Verified (`33 passed, 72 warnings in 0.83s`)

---

## 1. Architecture & Directory Structure

The backend is implemented inside `backend/` as a modular FastAPI application that loads the existing pre-trained NLP intent classifier (`backend/app/models/`) and serves strictly college-isolated FAQ answers from `dataset/processed/` while keeping a SQLAlchemy PostgreSQL repository prepared for future cutover.

```text
AI-Student-Chatbot/
├── backend/
│   ├── __init__.py
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models/                          # Unmodified pre-trained Joblib artifacts
│   │   │   ├── intent_classifier.joblib
│   │   │   ├── tfidf_vectorizer.joblib
│   │   │   └── model_metadata.json
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py
│   │   │   ├── colleges.py
│   │   │   └── health.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── chatbot_service.py
│   │   │   ├── data_store.py
│   │   │   ├── intent_classifier.py         # Existing reusable prediction service
│   │   │   └── postgres_repository.py       # Prepared SQLAlchemy ORM repository
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── config.py
│   │       ├── database.py                  # Prepared SQLAlchemy ORM schema & sessions
│   │       ├── dependencies.py
│   │       ├── schemas.py
│   │       └── train_intent_classifier.py   # Existing Phase 1 training script (not re-run)
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_chat_api.py
│       ├── test_colleges_api.py
│       └── test_intent_prediction.py
```

---

## 2. Implemented API Endpoints

OpenAPI interactive documentation is automatically served at `/docs` and `/openapi.json`.

| Method | Path | Purpose | Error Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Root API overview and endpoint links | — |
| `GET` | `/health` | Readiness check (classifier loaded, intent count, active backend, PostgreSQL status, college count) | — |
| `GET` | `/api/colleges` | List registered colleges with `verified_faq_count` and `pending_faq_count` | — |
| `POST` | `/api/colleges/select` | Validate target `college_id`, reset prior college context when switching colleges, return supported categories | `404` (`INVALID_COLLEGE_ID`) |
| `GET` | `/api/colleges/{college_id}` | Return full isolated institutional profile for one college | `404` (`INVALID_COLLEGE_ID`) |
| `GET` | `/api/colleges/{college_id}/faqs` | List FAQs filtered strictly to `{college_id}`, with optional `category` and `verification_status` query filters | `404` (`INVALID_COLLEGE_ID`) |
| `POST` | `/api/chat` | Classify question intent and return general, verified FAQ, `PENDING_VERIFICATION`, or low-confidence unknown response | `400` (`EMPTY_QUESTION`, `MISSING_COLLEGE_ID`), `404` (`INVALID_COLLEGE_ID`) |

---

## 3. Chatbot Routing, Verification & Isolation Guarantees

Implemented in [`ChatbotService`](../backend/app/services/chatbot_service.py) and [`JsonDataStore`](../backend/app/services/data_store.py):

1. **Question & `college_id` Sanitization:**
   - Blank or whitespace-only `question` values raise `EmptyQuestionError` (`400 EMPTY_QUESTION`).
   - Any non-empty `college_id` is immediately verified against the college registry (`colleges.json` / `colleges` table); unregistered identifiers raise `InvalidCollegeError` (`404 INVALID_COLLEGE_ID`) before any response is generated.
2. **Pre-Trained NLP Inference Without Retraining:**
   - Reuses [`predict_intent`](../backend/app/services/intent_classifier.py) with the pre-trained TF-IDF vectorizer and Logistic Regression model (`DEFAULT_CONFIDENCE_THRESHOLD = 0.25`, configurable globally via `CONFIDENCE_THRESHOLD` or per request).
3. **Unknown Query Fallback:**
   - Queries whose highest predicted probability falls below the threshold return `200 OK` with `intent = "unknown"`, `is_unknown = true`, `response_type = "unknown"`, `verification_status = "NOT_APPLICABLE"`, candidate suggestions, and guidance on supported topics.
4. **General Intents (`college_specific = false`):**
   - Conversational intents (`greeting`, `goodbye`, `salutation`, `general_queries`) return `response_type = "general"` and `verification_status = "GENERAL"` directly from `student_intents.json` even when `college_id` is omitted.
5. **College-Specific Intents (`college_specific = true`):**
   - Omitting or sending a blank `college_id` raises `MissingCollegeError` (`400 MISSING_COLLEGE_ID`).
   - FAQs are indexed strictly by `(college_id, category)` so data from `college_001` can never appear in queries for `college_002` or `college_003`.
   - **`VERIFIED` records:** When verified FAQs exist for `(college_id, category)` (such as NRI University `college_location`, `courses`, `contact_info`, `admissions`), `_rank_faqs_within_slice` ranks only the records inside that `(college_id, category)` slice via TF-IDF cosine similarity and token overlap, returning `response_type = "verified_faq"`, `verification_status = "VERIFIED"`, `source`, `last_verified`, and `related_verified_faqs`.
   - **`PENDING_VERIFICATION` / unpopulated categories:** When no `VERIFIED` record exists for `(college_id, category)` (including `fees`, `scholarships`, `placements`, `internships`, `hostel`, `syllabus`, or template colleges `college_002`/`college_003`), the endpoint returns `response_type = "pending_verification"` and `verification_status = "PENDING_VERIFICATION"` with an explicit notice advising direct verification rather than fabricating answers.

---

## 4. Prepared PostgreSQL Integration

While the active runtime serves JSON datasets cleanly (`FAQ_BACKEND=json`), PostgreSQL support is prepared cleanly via SQLAlchemy 2.0 in [`database.py`](../backend/app/utils/database.py) and [`postgres_repository.py`](../backend/app/services/postgres_repository.py):

- **ORM Tables (`Base`):**
  - `colleges` (`CollegeORM`): Primary key `college_id`, metadata fields, and serialized `institutional_data_json`.
  - `college_faqs` (`CollegeFAQORM`): Foreign key `college_id -> colleges.college_id` (`ON DELETE CASCADE`) with composite index `ix_college_faqs_college_category (college_id, category)`.
  - `chat_query_logs` (`ChatQueryLogORM`): Prepared analytics audit schema.
- **Repository Parity:**
  - `PostgresDataStore` implements the exact `FAQDataStoreProtocol` interface (`list_colleges`, `get_college_summary`, `get_college_profile`, `get_college_faqs`, `lookup_category_faqs`) plus `sync_from_json_data(...)` to idempotently load `colleges.json` and `college_faq.json` into relational tables when `FAQ_BACKEND=postgres` and `DATABASE_URL` are configured.

---

## 5. Verification & Test Results

Executed `python -m pytest -v AI-Student-Chatbot/backend/tests`:

- **Total tests:** `33` (`33 passed`, `0 failed`, `0 skipped`, `72 warnings` in `0.83s`)
  - `backend/tests/test_intent_prediction.py` (`9` test cases): general intents (`greeting`, `goodbye`/`salutation`), independent prediction across college intents including `PENDING_VERIFICATION` categories (`fees`, `scholarships`, `placements`, `internships`, `hostel`, `admissions`, `college_location`), empty query handling, out-of-domain threshold fallback, and strict threshold sensitivity.
  - `backend/tests/test_colleges_api.py` (`6` test cases): `/`, `/health`, `/openapi.json` schema verification, `GET /api/colleges` verified/pending counts (`college_001`: 15 verified / 13 pending; `college_002` & `college_003`: 0 verified / 14 pending), `GET /api/colleges/{college_id}` valid/404 handling, `POST /api/colleges/select` college switching and context reset confirmation, `GET /api/colleges/{college_id}/faqs` isolated filtering, and `PostgresDataStore.sync_from_json_data` + `(college_id, category)` isolation test on a temporary SQLite database.
  - `backend/tests/test_chat_api.py` (`18` test cases): general intent queries with and without `college_id`, `VERIFIED` `college_001` FAQ retrieval with sources (`college_location`, `courses`, `contact_info`, `admissions`), `PENDING_VERIFICATION` handling (`fees`, `scholarships`, `placements`, `internships`, `hostel`, `syllabus`), cross-college zero-leakage verification against `college_002` and `college_003`, `400 MISSING_COLLEGE_ID`, `404 INVALID_COLLEGE_ID`, `400 EMPTY_QUESTION`, and unknown query confidence fallback.
- **Runtime Note:** `conftest.py` uses an `ASGITestClient` wrapper built on `httpx.AsyncClient(transport=httpx.ASGITransport(app=app))` and `asyncio.Runner` because `httpx 0.28.1` removed the `app=` parameter expected by `starlette 0.27.0` (`fastapi 0.104.1`) `TestClient`, without modifying installed package versions.

---

## 6. Dataset & Model Integrity Verification

- `dataset/raw/intents.json` and `dataset/raw/model.h5`: unmodified.
- `dataset/processed/` (`student_intents.json`, `colleges.json`, `college_faq.json`, `dataset_summary.json`): unmodified.
- `backend/app/models/` (`intent_classifier.joblib`, `tfidf_vectorizer.joblib`, `model_metadata.json`): unmodified; loaded read-only at runtime.
- `frontend/`: untouched (reserved for Phase 3).

