# Dataset Cleaning & Preparation Report

**Project:** AI-Powered Multi-College Chatbot for Student Queries  
**Source Dataset (Untouched):** `dataset/raw/intents.json`  
**Generated Files:**
- `dataset/processed/student_intents.json`
- `dataset/processed/college_faq.json`
- `dataset/processed/dataset_summary.json`

**Date:** 2026-11-11

---

## 1. Cleaning Summary & Pattern Reconciliation

| Metric | Count | Notes |
| --- | ---: | --- |
| **Original Intents** | 39 | From `dataset/raw/intents.json` |
| **Original Question Patterns** | 412 | Raw `text` entries across all 39 intents |
| **Original Responses** | 50 | Raw `responses` entries (many containing placeholders/URLs) |
| **Removed Irrelevant / Inappropriate Intents** | 4 | `swear` (9), `random` (3), `creator` (16), `name` (13) → **41 patterns removed** |
| **Merged / Consolidated Intents** | 9 → 3 | `facilities` + `infrastructure` + `floors` → `facilities`; `canteen` + `menu` → `canteen`; `hod` + `ithod` + `computerhod` + `extchod` → `department_hod` |
| **Added Student Intent** | 1 | `internships` (**10 new patterns**) |
| **Dropped Special / Disambiguated Patterns** | 7 | Corrupted text, incomplete fragment, `UNI`-specific height trivia, and cross-intent overlaps |
| **Removed Intra-Intent Duplicate Patterns** | 7 | Deduplicated after lowercasing, typo correction, and punctuation cleanup |
| **Cleaned Intents** | **30** | All normalized to lowercase `snake_case` |
| **Cleaned Question Patterns** | **367** | Exact check: `412 - 41 - 7 - 7 + 10 = 367` |
| **Cleaned Responses** | **36** | Placeholder-free general & multi-college lookup responses |
| **Sample Multi-College FAQ Records** | **15** | Schema template records across `college_001` (12) and `college_002` (3) |

---

## 2. Intent Cleaning & Normalization Details

### 2.1 Removed Intents (4 Intents · 41 Patterns)

| Raw Intent | Patterns Removed | Reason |
| --- | ---: | --- |
| `swear` | 9 | Inappropriate profanity / abusive terms |
| `random` | 3 | Irrelevant personal/romantic chatter (`"I love you"`, `"Will you marry me"`, `"Do you love me"`) |
| `creator` | 16 | Irrelevant developer-credit template intent (`"who created you"` → `"College students"`) |
| `name` | 13 | Irrelevant hardcoded bot-persona template (`"Mind Reader"`) |

### 2.2 Merged Intents (9 Raw Intents → 3 Clean Intents)

| Target Intent (`snake_case`) | Merged Raw Intents | Rationale |
| --- | --- | --- |
| `facilities` | `facilities`, `infrastructure`, `floors` | Consolidates fragmented campus infrastructure, lab, and building-floor queries into one cohesive intent |
| `canteen` | `canteen`, `menu` | Unifies canteen availability, location, and food-menu questions without cross-intent ambiguity |
| `department_hod` | `hod`, `ithod`, `computerhod`, `extchod` | Replaces branch-hardcoded/contradictory single-college HOD intents with a unified multi-college HOD intent |

### 2.3 All Cleaned Intents in `student_intents.json` (30 Categories)

| # | Cleaned Intent (`snake_case`) | Source Raw Intent(s) | Cleaned Patterns | Responses | College-Specific |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `admissions` | `admission` | 6 | 1 | Yes |
| 2 | `admission_documents` | `document` | 13 | 1 | Yes |
| 3 | `seat_intake` | `college intake` | 9 | 1 | Yes |
| 4 | `courses` | `course` | 24 | 1 | Yes |
| 5 | `syllabus` | `syllabus` | 6 | 1 | Yes |
| 6 | `examinations` | `sem` | 10 | 1 | Yes |
| 7 | `fees` | `fees` | 22 | 1 | Yes |
| 8 | `scholarships` | `scholarship` | 26 | 1 | Yes |
| 9 | `placements` | `placement` | 9 | 1 | Yes |
| 10 | `internships` | *(New — Task 1.2)* | 10 | 1 | Yes |
| 11 | `hostel` | `hostel` | 20 | 1 | Yes |
| 12 | `library` | `library` | 14 | 1 | Yes |
| 13 | `facilities` | `facilities`, `infrastructure`, `floors` | 13 | 1 | Yes |
| 14 | `canteen` | `canteen`, `menu` | 18 | 1 | Yes |
| 15 | `sports` | `sports` | 7 | 1 | Yes |
| 16 | `college_location` | `location` | 14 | 1 | Yes |
| 17 | `college_hours` | `hours` | 16 | 1 | Yes |
| 18 | `contact_info` | `number` | 15 | 1 | Yes |
| 19 | `campus_events` | `event` | 11 | 1 | Yes |
| 20 | `holidays_and_vacations` | `vacation` | 12 | 1 | Yes |
| 21 | `mess_and_bus_timetable` | `Mess Timetable` | 5 | 1 | Yes |
| 22 | `department_hod` | `hod`, `ithod`, `computerhod`, `extchod` | 15 | 1 | Yes |
| 23 | `principal_info` | `principal` | 7 | 1 | Yes |
| 24 | `dress_code` | `uniform` | 9 | 1 | Yes |
| 25 | `student_committees` | `committee` | 6 | 1 | Yes |
| 26 | `anti_ragging` | `ragging` | 10 | 1 | Yes |
| 27 | `general_queries` | `task` | 6 | 2 | No |
| 28 | `greeting` | `greeting` | 9 | 3 | No |
| 29 | `goodbye` | `goodbye` | 12 | 3 | No |
| 30 | `salutation` | `salutaion` | 13 | 2 | No |

### 2.4 Pattern Cleaning & Duplicate Removals

- **Text normalization applied:** trimmed whitespace, collapsed repeated spaces, lowercased consistently, stripped trailing `?`/`!`/`.`, replaced `UNI` / `(your univrsity(UNI) name)` placeholders with `college`, and fixed spelling typos (`univrsity`, `admision`, `servive`, `cafetaria`, `whatv`, `stundent`, `committe`, `calander`, `taking to`, `these year`, `whats is`, `wheres`).
- **7 Intra-Intent Duplicates Removed:**
  1. `college timing` (`hours` → `college_hours`)
  2. `Computer engineering?` (`course` → `courses`, case duplicate of `computer engineering`)
  3. `IT` (`course` → `courses`, case duplicate of `it`)
  4. `how much is the fees` (`fees` → `fees`)
  5. `floors in college` (`floors` → `facilities`)
  6. `syllabus` (`syllabus` → `syllabus`)
  7. `exam dates` (`sem` → `examinations`)
  *(Note: the 2 intra-intent duplicates in `creator` and `name` were removed alongside those intents.)*
- **7 Special / Cross-Intent Disambiguated Patterns Dropped:**
  1. `greeting`: `"??? ??? ??"` (corrupted/non-meaningful symbol text)
  2. `course`: `"list of courses offered in"` (incomplete dangling fragment duplicating `"list of courses offered"`)
  3. `hostel`: `"hostel fees"` & `"what is the hostel fee"` (routed consistently to `fees` which already contains all 8 hostel room fee queries)
  4. `floors`: `"how tall is UNI's College of Engineering college building"` (single-college template trivia)
  5. `Mess Timetable`: `"timetable"` (collided with `syllabus`) & `"Academic Calander"` (belongs to `examinations` / `holidays_and_vacations`)

---

## 3. Multi-College FAQ Sample Schema (`college_faq.json`)

`dataset/processed/college_faq.json` defines the multi-college schema without inventing any institutional facts, fees, contacts, or URLs.

- **Required Record Fields (7):** `college_id`, `college_name`, `category`, `question`, `answer`, `source`, `last_verified`
- **Sample Records Included:** **15** template records (`college_001` across 12 core categories, plus `college_002` across 3 categories to demonstrate per-college scoping)
- **Verification Status:** All sample records use `source: "pending_official_college_source"` and `last_verified: "pending"` until real college data is onboarded.

---

## 4. Validation Results (All Checks Passed)

| Validation Check | Result | Findings |
| --- | --- | --- |
| **1. JSON Syntax Validity** | **PASS** | `student_intents.json`, `college_faq.json`, and `dataset_summary.json` all parse cleanly as valid UTF-8 JSON |
| **2. Duplicate Questions Check** | **PASS (0 duplicates)** | 0 duplicate patterns across all 30 intents in `student_intents.json`; 0 duplicate `(college_id, question)` pairs in `college_faq.json` |
| **3. Missing / Empty Fields Check** | **PASS (0 missing)** | 0 missing keys, 0 `null` values, and 0 empty strings/lists across all intents and FAQ records; unused raw metadata (`extension`, `" context"`, `entityType: "NA"`, `entities`) removed |
| **4. Placeholder Answers Check** | **PASS (0 raw placeholders)** | 0 legacy broken placeholders (`XYZ`, `LINK`, `NUMBER`, `ADD NUMBER`, `ADD YOU...`, `ENTER YOUR OWN...`, malformed `href=/"..."`, or external `lightningmcqueen-95` link) remain in any processed file |
| **5. `college_id` Presence Check** | **PASS (15/15 records)** | Every FAQ record in `college_faq.json` contains a valid non-empty `college_id` |
| **6. Intent Naming Convention** | **PASS (30/30 intents)** | 100% of intents match `^[a-z][a-z0-9_]*$` (`lowercase snake_case`) |
| **7. Raw Files Integrity Check** | **PASS** | `dataset/raw/intents.json` (30,072 bytes) and `dataset/raw/model.h5` (182,284 bytes) remain completely unmodified |

---

## 5. Pending College-Specific Information

Before populating production college records in `college_faq.json`, verified official data must be collected per onboarded `college_id` for all **26** college-specific categories listed in `dataset/processed/dataset_summary.json` (including official tuition & hostel fees, verified courses/intake, admission documents & portals, scholarship schemes, placement & internship policies, hostel rules, library timings, campus facilities, canteen menu, sports facilities, verified street address/map link, working hours, contact numbers, events, academic calendars, mess/bus timetables, HOD & principal contacts, dress code circular, student committees, and anti-ragging helpline details).

