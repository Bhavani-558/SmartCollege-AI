# Intent Recognition Diagnosis and Fix Report

**Project:** SmartCollege AI — AI-Powered Multi-College Chatbot for Student Queries  
**Model Architecture Preserved:** Scikit-learn `TfidfVectorizer` (`analyzer="char_wb"`, `ngram_range=(3, 5)`, `sublinear_tf=True`, `lowercase=True`) + `LogisticRegression` (`C=10.0`, `max_iter=1000`, `random_state=42`)  
**Confidence Threshold Preserved:** `0.25`  
**Total Intents Preserved:** `30` (across all 5 integrated colleges)

---

## 1. Problem Statement

Testing revealed that equivalent student queries were classified inconsistently depending on phrasing, sentence length, or inclusion of a college name:

- `"Campus location."` -> `college_location` (`0.3056` confidence)
- `"What is the campus location of NRI University?"` -> `unknown` (`candidate_intent="college_location"`, `0.2490` — just below `0.25`)
- `"Campus location of SRM University."` -> `unknown` (`candidate_intent="college_location"`, `0.2281`)
- `"Campus location of KL Deemed to be University."` -> `unknown` (`candidate_intent="college_location"`, `0.2127`)
- `"Campus location of Prasad V Potluri Siddhartha Institute of Technology."` -> `courses` (`0.2669` — misclassified instead of `college_location`, which scored only `0.097`)
- Conversational variations such as `"Where is SRM University-AP situated?"` (`0.1610`), `"Where is the campus situated?"` (`0.1343`), `"How can I reach the campus?"` (`0.2108`), `"Can you tell me where the campus is?"` (`0.1349`), `"What degree programs are available here?"` (`0.1957`), and `"Does SRM University-AP provide bus transport from Vijayawada?"` (`0.0961`) also fell below `0.25` (`unknown`).

---

## 2. Root Cause Analysis

1. **Missing institutional and spatial vocabulary in `college_location`:**  
   All 14 original patterns in `college_location` used `"college"` and omitted `"campus"`, `"university"`, `"institution"`, `"situated"`, `"location of ..."`, and directions (`"how can i reach the campus"`). Meanwhile `"campus"` appeared in `facilities` (`"size of campus"`) and `campus_events`, pulling campus-phrased location queries away from `college_location`.
2. **L2-normalized character n-gram dilution on long college-named queries:**  
   With `TfidfVectorizer` (`char_wb`, n-grams `3–5`), appending long proper nouns (`"Prasad V Potluri Siddhartha Institute of Technology"`) dilutes the L2-normalized vector weight of short location cues like `"campus location"` and introduces lexical overlap (`"technology"` matching `"information technology"` in `courses`).
3. **Training pattern imbalance across student intents:**  
   Core intents such as `admissions`, `mess_and_bus_timetable`, `general_queries`, `syllabus`, and `sports` had far fewer patterns (`5–7`) than `hostel`/`fees`/`courses`/`scholarships` (`20–26`), and conversational synonyms (`"situated"`, `"degree programs"`, `"cost per year"`, `"financial aid"`, `"tuition fee waiver"`, `"bus transport"`) were underrepresented.
4. **Partial punctuation normalization in `normalize_query()`:**  
   `backend/app/services/intent_classifier.py` previously stripped only trailing `[?!.]+$`, leaving internal punctuation (`,;:!?()"'` and sentence-ending periods inside multi-sentence inputs) uncleaned while preserving characters inconsistently.

---

## 3. Changes Applied

### 3.1 Query Normalization (`backend/app/services/intent_classifier.py`)
Updated `normalize_query(text: str)` (`lines 20–28`) while keeping hyphens (`SRM University-AP`) and slashes (`ai/ml`) intact:
- Normalizes sentence-ending dots (`r"\.+(?=\s|$)" -> " "`)
- Replaces punctuation delimiters (`r'[,;:!?()"\']+' -> " "`)
- Collapses repeated whitespace and lowercases input cleanly before TF-IDF vectorization

### 3.2 Training Dataset Expansion (`dataset/processed/student_intents.json`)
Expanded generic natural-language variations without hardcoding proper college names and without changing the 30 intent labels or dataset verification workflow (`total patterns`: `367` -> `564`):
- `college_location` (`14` -> `53` patterns): added generic campus, university, institute, institution, situated, address, directions (`"how can i reach ..."`), and `"location of this university/college/institution"` structures.
- Key college-specific intents: enriched natural paraphrases and synonyms for `admissions` (`20`), `courses` (`38`), `fees` (`35` -> `39`, including `"cost per year"` variations), `scholarships` (`37` -> `42`, including `"tuition fee waiver"` and `"financial aid"`), `placements` (`23`), `internships` (`21`), `hostel` (`33`), `library` (`23`), `facilities` (`23`, preserving bus/transport availability matching verified `college_002`/`003`/`004` FAQs), `mess_and_bus_timetable` (`12`), and `contact_info` (`27`), plus supporting intents (`canteen`, `syllabus`, `seat_intake`, `sports`, `greeting`, `dress_code`, `general_queries`).

### 3.3 Retrained Model Artifacts
Executed `python backend/app/utils/train_intent_classifier.py`, updating:
- `backend/app/models/tfidf_vectorizer.joblib`
- `backend/app/models/intent_classifier.joblib`
- `backend/app/models/model_metadata.json`
- `docs/confusion_matrix.png`
- `docs/model_evaluation_report.md`

### 3.4 Regression Tests Added
- `backend/tests/test_intent_prediction.py`: added `test_natural_language_and_named_college_variations` (42 parametrized short, long, formal, conversational, and named-college cases) and `test_out_of_domain_queries_remain_unknown` (5 out-of-domain, gibberish, and empty cases).
- `backend/tests/test_chat_api.py`: added `test_college_location_variations_across_all_five_colleges` (`college_001`–`college_005` across `"Campus location of [college name]."`, `"Where is the campus located?"`, and `"Tell me the college address."`) and `test_college_specific_queries_stay_isolated_and_preserve_pending` (verifying no cross-college leakage and `PENDING_VERIFICATION` preservation).

---

## 4. Before vs. After Intent Prediction Comparison

### 4.1 Key Regression Probes (`predict_intent`)

| Query | Baseline Intent (Conf) | Updated Intent (Conf) | Status |
| --- | --- | --- | --- |
| `"Campus location."` | `college_location` (`0.3056`) | `college_location` (`0.9746`) | Improved (+0.6690) |
| `"What is the campus location of NRI University?"` | `unknown` (cand `college_location`, `0.2490`) | `college_location` (`0.9766`) | Fixed |
| `"Campus location of SRM University."` | `unknown` (cand `college_location`, `0.2281`) | `college_location` (`0.9685`) | Fixed |
| `"Campus location of KL Deemed to be University."` | `unknown` (cand `college_location`, `0.2127`) | `college_location` (`0.9518`) | Fixed |
| `"Campus location of Siddhartha Academy of Higher Education."` | `college_location` (`0.2608`) | `college_location` (`0.8164`) | Improved (+0.5556) |
| `"Campus location of Prasad V Potluri Siddhartha Institute of Technology."` | `courses` (`0.2669`) | `college_location` (`0.5710`) | Fixed |
| `"Where is SRM University-AP situated?"` | `unknown` (`0.1610`) | `college_location` (`0.7978`) | Fixed |
| `"Where is the campus situated?"` | `unknown` (`0.1343`) | `college_location` (`0.9393`) | Fixed |
| `"How can I reach the campus?"` | `unknown` (`0.2108`) | `college_location` (`0.9444`) | Fixed |
| `"Can you tell me where the campus is?"` | `unknown` (cand `general_queries`, `0.1349`) | `college_location` (`0.8435`) | Fixed |
| `"What degree programs are available here?"` | `unknown` (cand `courses`, `0.1957`) | `courses` (`0.8368`) | Fixed |
| `"Does SRM University-AP provide bus transport from Vijayawada?"` | `unknown` (cand `sports`, `0.0961`) | `facilities` (`0.7585`) | Fixed |
| `"What is the weather in Hyderabad today?"` | `unknown` | `unknown` (cand `canteen`, `0.1036`) | Preserved OOD |

### 4.2 Overall Model Evaluation Metrics (`train_intent_classifier.py`)

| Metric | Baseline (`n=367`, `test=74`) | Updated (`n=564`, `test=113`) |
| --- | ---: | ---: |
| **Hold-Out Accuracy** | `0.9189` (91.89%) | **`0.9735` (97.35%)** |
| **Hold-Out Precision (Macro)** | `0.9100` | **`0.9750`** |
| **Hold-Out Precision (Weighted)** | `0.9081` | **`0.9801`** |
| **Hold-Out Recall (Macro)** | `0.9056` | **`0.9600`** |
| **Hold-Out Recall (Weighted)** | `0.9189` | **`0.9735`** |
| **Hold-Out F1-Score (Macro)** | `0.8982` | **`0.9596`** |
| **Hold-Out F1-Score (Weighted)** | `0.9042` | **`0.9719`** |
| **5-Fold CV Accuracy** | `0.9128 +/- 0.0254` | **`0.9308 +/- 0.0105`** |
| **5-Fold CV F1-Score (Macro)** | `0.8852` | **`0.9097 +/- 0.0091`** |

- **`college_location` hold-out per-class score (`support=11`):** Precision `1.0000`, Recall `1.0000`, F1-Score `1.0000` (`11/11` on diagonal in the 30x30 confusion matrix).
- **Hold-out misclassifications (`3/113`):** `'good day'` (`greeting` -> `goodbye`, `0.4897`), `'book facility'` (`library` -> `facilities`, `0.3714`), `'why i should use you'` (`general_queries` -> `college_hours`, `0.2150`).

---

## 5. Verification Summary

| Check | Outcome | Notes |
| --- | --- | --- |
| **Backend Tests (`pytest backend/tests`)** | **87 passed, 0 failed, 0 skipped** (`0.99s`) | Executed with `BypassSandbox: true` because Windows standard sandbox blocks `socket.socketpair()` (`accept()`) in `ProactorEventLoop._make_self_pipe()` for `ASGITestClient`. |
| **Frontend Tests (`npm test -- --run`)** | **3 test files passed, 11 tests passed** | `apiAndUtils.test.ts` (2), `chatHistoryAndVoice.test.tsx` (3), `App.test.tsx` (6). |
| **Frontend TypeScript (`npx tsc -b`)** | **Passed (exit 0)** | Zero type errors. |
| **Frontend Production Build (`npm run build`)** | **Passed (exit 0)** | Built `dist/index.html` and hashed asset bundles in `30.05s`. |
| **Live FastAPI Server (`uvicorn`, `/health` & `/api/chat`)** | **Verified across `college_001`–`college_005`** | All 5 colleges returned `HTTP 200`, `intent=college_location`, `response_type=verified_faq`, `verification_status=VERIFIED` with college-specific answers; `college_001` bus timetable returned `PENDING_VERIFICATION`; `college_id=None` on `"Campus location."` returned `HTTP 400 MISSING_COLLEGE_ID`; OOD weather query returned `HTTP 200 unknown`. |

---

## 6. Remaining Limitations

- Extremely long unseen proper nouns outside training patterns can still reduce relative L2-normalized TF-IDF confidence compared to short queries (e.g., `"Campus location of Prasad V Potluri Siddhartha Institute of Technology."` scores `0.5710` vs `"Campus location."` at `0.9746`), though both comfortably exceed the `0.25` threshold.
- Very short ambiguous 2-word phrases with overlapping vocabulary across distinct intents (such as `"book facility"` between `library` and `facilities`, or `"good day"` between `greeting` and `goodbye`) remain borderline in character n-gram space.
- `college_faq.json` and `colleges.json` verification statuses (`117 VERIFIED`, `33 PENDING_VERIFICATION` across `150` FAQs) were intentionally left unchanged; pending categories continue returning explicit `PENDING_VERIFICATION` notices.

