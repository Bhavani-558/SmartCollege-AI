# Dataset Validation Report — `intents.json`

**File Inspected:** `dataset/raw/intents.json`  
**File Size / Lines:** 30,072 bytes · 1,207 lines  
**Project:** AI-Powered Multi-College Chatbot for Student Queries  
**Validation Date:** 2026-11-11  

---

## 1. Executive Summary

| Metric | Result | Notes |
| --- | --- | --- |
| **JSON Syntax Valid?** | **Yes (Valid JSON)** | Parsed cleanly with UTF-8 (`json.loads`); 0 duplicate keys inside objects |
| **Schema Consistency** | **Partial (2 key typos)** | 2 intents (`location`, `canteen`) use `" context"` (leading space) instead of `"context"` |
| **Total Intents** | **39** | All 39 `intent` names are unique |
| **Total Question Patterns (`text`)** | **412** | 403 exact-unique strings · 401 case/whitespace-normalized unique strings |
| **Total Responses (`responses`)** | **50** | 33 intents have 1 response; 6 intents have 2–4 responses |
| **Duplicate Question Patterns** | **11 pairs** | 7 exact intra-intent · 2 exact cross-intent · 2 case-only intra-intent |
| **Empty / Unused Schema Fields** | **5 fields across all 39 intents** | `context.in` (`""`), `extension.function` (`""`), `extension.responses` (`[]`), `entities` (`[]`), `entityType` (`"NA"`) |
| **Placeholder / Incomplete URL Responses** | **17 intents** | Contains `XYZ`, `NUMBER`, `ADD NUMBER`, `LINK`, descriptive `href` placeholders, `UNI`, etc. |
| **College-Specific Answers Requiring Verification** | **25+ intents** | Hardcoded timings, floors, courses, intake, menu, policies, bot name, and external URL |

---

## 2. JSON Structure & Schema Validation

- **Syntax Validity:** `dataset/raw/intents.json` is **syntactically valid JSON** (`json.loads` succeeds without errors, and no duplicate keys exist within any JSON object).
- **Top-Level Structure:** Single root object with one key: `"intents"` (an array of 39 intent objects).
- **Per-Intent Schema:** Every object contains 7 fields:
  - `intent` (`string`)
  - `text` (`array[string]`)
  - `responses` (`array[string]`)
  - `extension` (`object`: `function`, `entities`, `responses`)
  - `context` (`object`: `in`, `out`, `clear`)
  - `entityType` (`string`)
  - `entities` (`array`)
- **Structural / Key Anomalies Found:**
  1. **Leading-space key `" context"` (Lines 330 & 578):** In both `location` (line 330) and `canteen` (line 578), the key is `" context"` instead of `"context"`. While valid JSON, any parser indexing `item["context"]` directly will raise a `KeyError` on these two intents.
  2. **Duplicate `context.out` label:** Both `sem` (line 766) and `vacation` (line 1032) set `"out": "AcademicCalendar"`.
  3. **Inconsistent `intent` naming conventions:** Most intent keys are lowercase single words (`greeting`, `fees`, `library`), while a few use spaces/mixed case (`college intake`, `Mess Timetable`) or contain a typo (`salutaion` instead of `salutation`).

---

## 3. Complete Intent Categories & Counts

Total intents: **39** · Total question patterns: **412** · Total responses: **50**

| # | Intent Category | Lines | Question Patterns | Responses | `context.out` | Key Notes |
| --- | --- | --- | ---: | ---: | --- | --- |
| 1 | `greeting` | 3–34 | 10 | 3 | `GreetingUserRequest` | Contains `"??? ??? ??"` pattern; `context.clear: false` |
| 2 | `goodbye` | 35–69 | 12 | 4 | `LeavingUserRequest` | `context.clear: false` |
| 3 | `creator` | 70–105 | 16 | 1 | `AskingCreator` | 1 exact duplicate pattern; generic `"College students"` response |
| 4 | `name` | 106–141 | 13 | 4 | `AskingMyName` | 1 exact duplicate pattern; references `"Mind Reader"` |
| 5 | `hours` | 142–178 | 17 | 1 | `CollegeTimings` | 1 exact duplicate pattern; college-specific hours |
| 6 | `number` | 179–213 | 15 | 1 | `ContactRequest` | Placeholder `NUMBER` |
| 7 | `course` | 214–260 | 27 | 1 | `AskingCourses` | 2 case duplicates; `UNI` placeholder in patterns; college-specific branches |
| 8 | `fees` | 261–303 | 23 | 1 | `FeeStructure` | 1 intra-intent duplicate; 1 cross-intent duplicate (`hostel fees`); `LINK` placeholder |
| 9 | `location` | 304–337 | 14 | 1 | `AddressOfCollege` | `" context"` key typo; placeholder Google Map URL |
| 10 | `hostel` | 338–379 | 22 | 1 | `HostelRelatedQueries` | 1 cross-intent duplicate (`hostel fees`); placeholder hostel URL |
| 11 | `event` | 380–410 | 11 | 1 | `EventRelatedQueries` | Placeholder events URL |
| 12 | `document` | 411–443 | 13 | 1 | `DocumentsForAdmission` | Placeholder admission docs URL |
| 13 | `floors` | 444–470 | 7 | 1 | `FloorQueries` | 1 exact duplicate; `UNI` in pattern; hardcoded `"2 floors"` |
| 14 | `syllabus` | 471–497 | 7 | 1 | `SyllabusQueries` | 1 intra-intent duplicate (`syllabus`); 1 cross-intent duplicate (`timetable`); `TIMETABLE LINK` placeholder |
| 15 | `library` | 498–531 | 14 | 1 | `LibraryHours` | Placeholder URL; `target="blank"` typo; hardcoded library hours/count |
| 16 | `infrastructure` | 532–554 | 3 | 1 | `Infra` | College-specific infrastructure description |
| 17 | `canteen` | 555–585 | 11 | 1 | `Snacking` | `" context"` key typo; college-specific canteen claim |
| 18 | `menu` | 586–612 | 7 | 1 | `Menu` | College/region-specific menu items |
| 19 | `placement` | 613–641 | 9 | 1 | `Placements` | Placeholder placement URL |
| 20 | `ithod` | 642–665 | 4 | 1 | `HODs` | Placeholders `XYZ` and `(Place name)`; generic HOD patterns |
| 21 | `computerhod` | 666–689 | 4 | 1 | `ComputerHOD` | Placeholders `XYZ` and `(PLACE NAME)` |
| 22 | `extchod` | 690–713 | 4 | 1 | `DiffHODs` | Contradicts `ithod`/`computerhod` org structure |
| 23 | `principal` | 714–740 | 7 | 1 | `CollegePrincipal` | Placeholder `XYZ` + escalation policy |
| 24 | `sem` | 741–771 | 11 | 1 | `AcademicCalendar` | 1 exact duplicate (`exam dates`); placeholder `YOUR ACADEMIC CALENDER` |
| 25 | `admission` | 772–797 | 6 | 1 | `ProcessOfAdmission` | Placeholder `LINK OF ADMISSION DOCUMENT` |
| 26 | `scholarship` | 798–843 | 26 | 1 | `ScholarshipCriteria` | Placeholder `(SCHOLARSHIP DETAILS LINK)` |
| 27 | `facilities` | 844–868 | 5 | 1 | `Facilities` | College-specific facilities list |
| 28 | `college intake` | 869–897 | 9 | 1 | `Intake` | Hardcoded `"60 per branch"` intake |
| 29 | `uniform` | 898–926 | 9 | 1 | `UniformCollegeDressCode` | Full placeholder `ENTER YOUR OWN UNIVERSITY UNIFORM CIRCULER` |
| 30 | `committee` | 927–952 | 6 | 1 | `Committee` | Placeholder `ADD NUMBER` |
| 31 | `random` | 953–975 | 3 | 1 | `Inappropriate` | Generic out-of-scope response |
| 32 | `swear` | 976–1005 | 9 | 2 | `InappropriateSwearWords` | Generic profanity moderation responses |
| 33 | `vacation` | 1006–1037 | 12 | 1 | `AcademicCalendar` | Shares `context.out` with `sem`; college-specific calendar policy |
| 34 | `sports` | 1038–1064 | 7 | 1 | `Sports` | Malformed HTML `href=/"(LINK IF HAVE)"` placeholder |
| 35 | `salutaion` | 1065–1098 | 13 | 2 | `Salutation` | Intent key typo (`salutaion`) |
| 36 | `task` | 1099–1125 | 6 | 2 | `Task` | Generic bot capability descriptions |
| 37 | `ragging` | 1126–1155 | 10 | 1 | `Ragging` | College-specific anti-ragging policy claim |
| 38 | `hod` | 1156–1178 | 3 | 1 | `HODName` | Generic HOD prompt (`(HOD it)`) |
| 39 | `Mess Timetable` | 1179–1205 | 7 | 1 | `MessQueries` | Cross-intent duplicate (`timetable`); unverified external GitHub Pages link |

---

## 4. Duplicate Question Patterns

### 4.1 Exact Intra-Intent Duplicates (7 pairs)

| Intent | Pattern | Line Numbers |
| --- | --- | --- |
| `creator` | `"who created you"` | Lines 77, 84 |
| `name` | `"what are you"` | Lines 116, 121 |
| `hours` | `"college timing"` | Lines 152, 160 |
| `fees` | `"how much is the fees"` | Lines 273, 279 |
| `floors` | `"floors in college"` | Lines 450, 451 |
| `syllabus` | `"syllabus"` | Lines 476, 479 |
| `sem` | `"exam dates"` | Lines 744, 753 |

### 4.2 Exact Cross-Intent Duplicates (2 pairs — Classification Ambiguity)

| Pattern | Intent 1 (Line) | Intent 2 (Line) | Impact |
| --- | --- | --- | --- |
| `"hostel fees"` | `fees` (Line 280) | `hostel` (Line 346) | Same query maps to two conflicting intents/responses |
| `"timetable"` | `syllabus` (Line 477) | `Mess Timetable` (Line 1185) | Same query maps to academic syllabus vs. mess/bus timetable |

### 4.3 Case-Only Duplicates Within Same Intent (2 pairs)

| Intent | Variant 1 (Line) | Variant 2 (Line) |
| --- | --- | --- |
| `course` | `"computer engineering?"` (Line 234) | `"Computer engineering?"` (Line 236) |
| `course` | `"it"` (Line 237) | `"IT"` (Line 238) |

### 4.4 Notable Near-Duplicate / Semantic Overlap Across Intents

- `fees` (line 278: `"What is the fees of hostel"`) vs. `hostel` (line 354: `"what is the hostel fee"`).
- `ithod` (lines 645–646: `"Who is HOD"`, `"Where is HOD"`) overlaps with generic `hod` (line 1161: `"who is the hod"`).
- `Mess Timetable` (line 1188: `"Academic Calander"`) overlaps semantically with `sem` / `vacation` (both use `context.out: "AcademicCalendar"`), and also mixes `"Bus Timetable"` with `"Mess TimeTable"`.

---

## 5. Empty, Missing, and Non-Meaningful Values

### 5.1 Empty / Unused Metadata Fields Across All 39 Intents

None of the `intent`, `text`, or `responses` arrays are empty or contain `null`/empty strings. However, the following metadata fields are uniformly empty, `"NA"`, or unused across **all 39 out of 39** intents:

| Field | Value Observed | Count | Status |
| --- | --- | --- | --- |
| `extension.function` | `""` (empty string) | 39 / 39 | Empty in all intents |
| `extension.entities` | `false` | 39 / 39 | Disabled in all intents |
| `extension.responses` | `[]` (empty array) | 39 / 39 | Empty in all intents |
| `context.in` | `""` (empty string) | 39 / 39 | Empty in all intents (`" context"` in 2 intents) |
| `entityType` | `"NA"` | 39 / 39 | Placeholder `"NA"` in all intents |
| `entities` | `[]` (empty array) | 39 / 39 | Empty in all intents |

### 5.2 Missing Key (Due to Leading Whitespace Typo)

- `location` (Line 330): `" context"` instead of `"context"`.
- `canteen` (Line 578): `" context"` instead of `"context"`.

### 5.3 Corrupted / Non-Meaningful Pattern Entry

- `greeting` (Line 15): `"??? ??? ??"` — contains only question marks and spaces (likely an encoding corruption of non-ASCII greeting text in the original dataset).

---

## 6. Placeholder Answers & Incomplete / Malformed URLs

### 6.1 Placeholder Text & Missing Contact/Name Values in Responses

| Intent | Line | Exact Response Snippet / Placeholder | Issue |
| --- | --- | --- | --- |
| `number` | 199 | `You can contact at: NUMBER` | `NUMBER` placeholder |
| `ithod` | 651 | `...only one hod XYZ who available on (Place name)` | `XYZ` and `(Place name)` placeholders |
| `computerhod` | 675 | `...only one hod XYZ who available on (PLACE NAME)` | `XYZ` and `(PLACE NAME)` placeholders |
| `principal` | 726 | `XYZ is college principal...` | `XYZ` placeholder |
| `uniform` | 912 | `ENTER YOUR OWN UNIVERSITY UNIFORM CIRCULER` | Full instructional placeholder (+ typo `CIRCULER`) |
| `committee` | 938 | `...contact this number: ADD NUMBER` | `ADD NUMBER` placeholder (+ typo `committe`) |

### 6.2 Placeholder / Incomplete / Malformed URLs in Responses

| Intent | Line | `href` / HTML Found | Issues |
| --- | --- | --- | --- |
| `fees` | 289 | `href="LINK"` | Placeholder `LINK` |
| `location` | 323 | `href="ADD YOU GOOGLE MAP LINK HERE"` | Placeholder text; no surrounding sentence (only `" here"`) |
| `hostel` | 365 | `href="ADD YOUR HOSTEL DETAIL PDF LINK OR ANY INFORMATION LINK OR ADD YOU OWN ANSWERS"` | Placeholder text |
| `event` | 396 | `href="ADD YOUR FUNCTIONS LINK OR YOUR OWN RESPONSE"` | Placeholder text |
| `document` | 429 | `href="ADD LINK OF ADMISSION GUIDANCE DOCUMENT FROM YOUR UNIVERSITY WEBSITE"` | Placeholder text |
| `syllabus` | 483 | `href="TIMETABLE LINK"` | Placeholder text (`TIMETABLE LINK`) |
| `library` | 517 | `<a target="blank" href="ADD LIBRARY DETAIL LINK">here</a>` | Placeholder text + invalid `target="blank"` (missing `_`) |
| `placement` | 627 | `href="PLACEMENT INFORMATION LINK FROM YOUR UNIVERSITY WEBSITE IF THEY HAVE"` | Placeholder text |
| `sem` | 757 | `href="YOUR ACADEMIC CALENDER"` | Placeholder text (+ typo `CALENDER`) |
| `admission` | 783 | `href="LINK OF ADMISSION DOCUMENT"` | Placeholder text |
| `scholarship` | 829 | `href="(SCHOLARSHIP DETAILS LINK)"` | Placeholder text |
| `sports` | 1050 | `visit<a target="_blank" href=/"(LINK IF HAVE)">here</a>` | Placeholder text + **malformed HTML** `href=/"..."` (stray `/`) + missing space before `<a` |
| `Mess Timetable` | 1191 | `href="https://lightningmcqueen-95.github.io/collage/index.html"` | Unverified external/demo GitHub Pages link (note `collage` spelling); not college-specific |

### 6.3 Placeholders Inside Question Patterns (`text`)

- `course` (Lines 223, 226, 228–233): contains `UNI` and `(your univrsity(UNI) name)` as literal template placeholders in 8 patterns.
- `floors` (Line 452): `"how tall is UNI's College of Engineering college building"` contains literal `UNI`.

---

## 7. College-Specific Answers Requiring Verification (Multi-College Readiness)

Because this project targets a **multi-college** student chatbot, all hardcoded institutional facts, policies, branches, timings, and sample links below cannot be shared blindly across colleges and must be verified or parameterized per college:

| Category | Intent(s) | Hardcoded Claim / Value in `intents.json` | Verification Needed |
| --- | --- | --- | --- |
| **Bot Identity / Attribution** | `creator` (91), `name` (124–125) | `"College students"`, `"Mind Reader"` | Confirm institutional branding/chatbot name |
| **College Operating Hours** | `hours` (164) | `"College is open 8am-5pm Monday-Saturday!"` | Verify hours and Saturday working status per college |
| **Offered Courses / Branches** | `course` (246) | `"Information Technology, computer Engineering, Mechanical engineering,Chemical engineering, Civil engineering and extc Engineering."` | Verify actual programs/degrees per college (also patterns include `"AI/Ml"` on line 240, missing from response) |
| **Building Floors** | `floors` (456) | `"My College has total 2 floors "` | Verify campus/building details per college |
| **Library Count & Timings** | `library` (517) | `"one huge and spacious library.timings are 8am to 6pm"` | Verify number of libraries and operating hours per college |
| **Infrastructure & Facilities** | `infrastructure` (540), `facilities` (854) | `"Good IT Labs With Good Speed of Internet connection"`, `"fully AC Lab... smart classroom, Auditorium, library,canteen"` | Verify available campus facilities per college |
| **Canteen & Food Menu** | `canteen` (571), `menu` (598) | `"we serve Franky, Locho, Alu-puri, Kachori, Khavsa, Thaali and many more on menu"` | Verify canteen availability and actual menu per college |
| **Department HOD Structure** | `ithod` (651), `computerhod` (675), `extchod` (699), `hod` (1164) | `ithod`/`computerhod` claim *"All engineering departments have only one hod"*; `extchod`/`hod` claim *"Different school wise hod / HODs differ for each branch"* | Resolve internal contradiction and verify actual HODs & offices per college |
| **Principal & Escalation Flow** | `principal` (726) | `"call your branch hod first.That is more appropriate"` | Replace `XYZ` and verify escalation workflow per college |
| **Seat Intake** | `college intake` (883) | `"For IT, Computer and extc 60 per branch..."` | Verify sanctioned intake per branch & college |
| **Timetable / Academic Calendar Distribution** | `syllabus` (483), `vacation` (1023) | `"Timetable provide direct to the students"`, `"Academic calender is given to you by your class-soordinators..."` | Verify how each college distributes timetables/calendars |
| **Scholarships** | `scholarship` (829) | `"Many government scholarships are supported by our university."` | Verify eligible central/state/institutional scholarships per college |
| **Anti-Ragging Policy** | `ragging` (1141) | `"ragging free environment, and we have strict rules against ragging"` | Verify official anti-ragging committee contact/helpline per college |
| **External Timetable Link** | `Mess Timetable` (1191) | `https://lightningmcqueen-95.github.io/collage/index.html` | Replace demo GitHub Pages link with verified mess/bus/academic timetable per college |

---

## 8. Additional Spelling & Formatting Observations

- **Intent key typo:** `"salutaion"` (Line 1066) → `"salutation"`.
- **Pattern typos:** `"univrsity"` (Line 223), `"taking"` for `"talking"` (Line 120), `"hostel servive"` (Line 342), `"admision"` (Lines 415, 418), `"cafetaria"` (Lines 562, 568), `"whatv"` (Line 718), `"stundent"` (Line 878), `"committe"` (Lines 930–935), `"Calander"` (Line 1188).
- **Response typos & grammar issues:** `"timings"` after period without space (Line 517), `"Unversity's"` (Line 783), `"CIRCULER"` (Line 912), `"committe"` (Line 938), `"I am not program for this"` (Line 961), `"calender"` & `"class-soordinators"` (Line 1023), `"seat may be differ"` (Line 883).

---

## 9. Recommended Next Steps (Before Cleaning / Model Training)

1. Fix the `" context"` key typo in `location` and `canteen` and normalize intent naming (`salutaion`, `college intake`, `Mess Timetable`).
2. Remove the 9 exact duplicate patterns (including resolving the `hostel fees` and `timetable` cross-intent collisions) and the corrupted `"??? ??? ??"` pattern.
3. Separate **shared/generic intents** (e.g., `greeting`, `goodbye`, `task`, `swear`, `random`, `salutation`) from **college-specific knowledge** so multi-college answers can be loaded dynamically per institution (e.g., via a college profile/knowledge store or database) rather than hardcoded in `intents.json`.
4. Fix malformed HTML in `sports` (`href=/"..."`) and `library` (`target="blank"`), and replace all placeholders (`LINK`, `NUMBER`, `XYZ`, `UNI`, etc.) and the external GitHub Pages link.

