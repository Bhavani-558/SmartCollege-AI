# Five-College Research & Dataset Integration Audit Report

**Audit Date:** `2026-11-12`  
**Audit Mode:** **Strict Read-Only Audit** (no application code, JSON datasets, trained models, tests, or source-collection documents were modified; no data was fabricated or auto-corrected)  
**Audited Artifacts:**
- [`docs/five_college_data_collection_report.md`](../docs/five_college_data_collection_report.md)
- [`docs/nri_university_data_collection_report.md`](../docs/nri_university_data_collection_report.md)
- [`dataset/processed/colleges.json`](../dataset/processed/colleges.json) (`schema.version = 1.2`)
- [`dataset/processed/college_faq.json`](../dataset/processed/college_faq.json) (`schema.version = 1.1`, `150` records)
- [`dataset/processed/dataset_summary.json`](../dataset/processed/dataset_summary.json)

---

## Executive Summary

Across all `150` FAQ records (`30` per institution across `college_001`–`college_005`), institutional isolation by `college_id` is structurally intact (`0` duplicate `(college_id, question)` pairs, `0` duplicate non-pending `(college_id, answer)` pairs, `0` `college_name` mismatches, and `67 / 68` unique URLs returning live HTTP `200`). However, source-level audit against cached official HTML/PDF scrapes revealed several **factual reporting gaps, source-URL misattributions, metadata mismatches, and presentation issues** that should be reviewed and approved before editing any datasets or docs:

| Severity | Finding Summary | Scope |
| :--- | :--- | :--- |
| **High** | **Unsupported SRM-AP bus-route city list (`Vijayawada, Guntur, Tenali, Mangalagiri`)** in `colleges.json` and `five_college_data_collection_report.md` (`"Tenali"` does not appear in any scraped SRM-AP file and appears to come from KLU's `transp.aspx`). | `college_002`, `colleges.json`, Report |
| **High** | **SAHE (`college_004`) Placement CTC & Year Error**: `PENDING_VERIFICATION` FAQ states highest CTC is unavailable due to JS counter `'0'`, overlooking **`Amazon: Rs. 48 LPA` and `Myntra: Rs. 35.50 LPA`** published statically in the `2025-26` company/branch table on `placements/statistics/`; additionally, the `VERIFIED` top-recruiters FAQ labels `TCS (251), Capgemini (213), Accenture (210)...` as `"multi-year offer volumes"` rather than the first tab's single-year (`2025-26` / `Total 1920*`) listing. | `college_004` (`placements`), `colleges.json`, Report |
| **Medium** | **Broken Live URL (`HTTP 404`) Cited as FAQ `source`**: `https://www.srmap.edu.in/financial-aid-and-scholarship/` returns `404 Not Found` and is stored as the clickable `source` on `college_002` `PENDING_VERIFICATION` `[scholarships]`. | `college_002` |
| **Medium** | **SRM-AP Tuition Fee Pages Undated + Dual Specialization Fee Figures**: Neither `seas-btech-tuition-fee/` nor `psb-bba-tuition-fee/` states an academic year (e.g., `2026-27`), the B.Tech page leaves non-CSE/ECE engineering branch fees blank in the scraped top table and prints two differing figures (`Rs. 4,75,000` vs `Rs. 4,60,000`) for `CSE (AI & Future Technologies)` / `Product Engineering with AI`, and BBA scholarship Category A/D cells are partially blank on non-SAT columns. | `college_002` (`fees`, `scholarships`) |
| **Medium** | **Source-Page Misattributions (Claim Supported Only on a Different Official Page)**: At least **9 `VERIFIED` FAQs** across `college_002`–`college_005` include verified facts/phone numbers taken from a different official page than the single URL recorded in their `source` field (e.g., SRM MBA Rs. `9 LPA` sourced from `psb-mba-programme/` is cited under `crcs-placement-tracker/`, which instead shows Rs. `7.23 LPA` overall). | `college_002`, `college_003`, `college_004`, `college_005` |
| **Medium** | **KL University (`college_003`) Placement Year Unspecified in `cb2.pdf`**: `Rs. 81 LPA` highest CTC, `Rs. 7.25 LPA` engineering median CTC, `5,000+` placed, and `6,500+` offers in `cb2.pdf` do not state which graduating batch year they cover (unlike `12,000+` internships, which specifies `2024–25`). | `college_003` (`placements`) |
| **Low** | **Five `VERIFIED` FAQs Embed `PENDING_VERIFICATION` Disclaimers Inside Answers**, mixing verified and pending semantics inside a single record. | `college_002`, `003`, `004`, `005` |
| **Low** | **Cross-Mention Disambiguation Strings (`SAHE` <-> `PVPSIT`)**: 3 FAQ answers explicitly name the sibling Kanuru institution (`separate from PVPSIT` / `distinct from Siddhartha Academy of Higher Education`). | `college_004`, `college_005` |
| **Low** | **Documentation & Metadata Sync Gaps**: `nri_university_data_collection_report.md` still shows `28` FAQs vs `30` in JSON (the 2 new `college_001` records retain `2026-11-11` dates); `colleges.json["official_sources"]` and `five_college_data_collection_report.md` omit several URLs cited in `college_faq.json`; `colleges.json` SRM `syllabus_links` points to a fee page; `dataset_summary.json` retains legacy Phase 1 `pending_college_specific_information` text (`demo GitHub URL`). | `colleges.json`, `college_faq.json`, `dataset_summary.json`, Docs |

---

## 1. Record Count Verification (`college_faq.json` vs Reports)

### 1.1 Per-College & Overall Counts

| `college_id` | Institution | `short_code` | `college_faq.json` Total | `VERIFIED` | `PENDING_VERIFICATION` | Matches Report (`docs/five_college_data_collection_report.md`)? |
| :--- | :--- | :--- | ---: | ---: | ---: | :--- |
| `college_001` | NRI University | `NRIU` | 30 | 15 | 15 | **Yes** (`15 / 15 / 30`) |
| `college_002` | SRM University-AP | `SRMAP` | 30 | 23 | 7 | **Yes** (`23 / 7 / 30`) |
| `college_003` | KL Deemed to be University | `KLU` | 30 | 28 | 2 | **Yes** (`28 / 2 / 30`) |
| `college_004` | Siddhartha Academy of Higher Education | `SAHE` | 30 | 25 | 5 | **Yes** (`25 / 5 / 30`) |
| `college_005` | Prasad V Potluri Siddhartha Institute of Technology | `PVPSIT` | 30 | 26 | 4 | **Yes** (`26 / 4 / 30`) |
| **Total** | **5 Institutions** | — | **150** | **117** | **33** | **Exact match** (`total_faqs = 150`, `dataset_summary.json = 150`) |

### 1.2 Category Breakdown Observed in `college_faq.json`

- **`college_001` (`NRIU`)** — Verified (`15`): `admissions` (2), `college_location` (3), `contact_info` (3), `courses` (4), `general_information` (3). Pending (`15`): `admission_documents`, `anti_ragging`, `department_hod`, `examinations`, `facilities`, `fees`, `hostel`, `internships`, `library`, `mess_and_bus_timetable`, `placements`, `principal_info`, `scholarships`, `seat_intake`, `sports` (1 each).
- **`college_002` (`SRMAP`)** — Verified (`23`): `admissions` (2), `anti_ragging` (1), `college_location` (1), `contact_info` (2), `courses` (3), `facilities` (1), `fees` (2), `hostel` (2), `internships` (2), `library` (1), `placements` (3), `principal_info` (1), `scholarships` (1), `sports` (1). Pending (`7`): `admission_documents`, `examinations`, `fees`, `hostel`, `scholarships`, `seat_intake`, `syllabus` (1 each).
- **`college_003` (`KLU`)** — Verified (`28`): `admission_documents` (1), `admissions` (2), `anti_ragging` (1), `college_location` (1), `contact_info` (2), `courses` (3), `examinations` (1), `facilities` (1), `fees` (3), `hostel` (3), `internships` (2), `library` (1), `placements` (3), `principal_info` (1), `scholarships` (2), `sports` (1). Pending (`2`): `seat_intake`, `syllabus` (1 each).
- **`college_004` (`SAHE`)** — Verified (`25`): `admissions` (2), `anti_ragging` (1), `college_location` (1), `contact_info` (2), `courses` (3), `examinations` (1), `facilities` (1), `fees` (3), `hostel` (2), `library` (1), `placements` (2), `principal_info` (1), `scholarships` (2), `seat_intake` (1), `sports` (1), `syllabus` (1). Pending (`5`): `admission_documents` (1), `hostel` (1), `internships` (2), `placements` (1).
- **`college_005` (`PVPSIT`)** — Verified (`26`): `admissions` (2), `anti_ragging` (1), `college_location` (1), `contact_info` (2), `courses` (3), `examinations` (1), `facilities` (1), `fees` (2), `hostel` (2), `internships` (1), `library` (1), `placements` (3), `principal_info` (1), `scholarships` (2), `seat_intake` (1), `sports` (1), `syllabus` (1). Pending (`4`): `admission_documents`, `fees`, `hostel`, `internships` (1 each).

### 1.3 Duplicates & Schema Integrity

- **Duplicate `(college_id, question)` pairs:** `0`
- **Duplicate non-pending `(college_id, answer)` pairs:** `0`
- **`college_name` vs `colleges.json` mismatches:** `0`
- **`PENDING_VERIFICATION` records missing `"pending"` marker in `answer`:** `0`

---

## 2. NRI University (`college_001`) Count Discrepancy (`28` -> `30`)

`docs/nri_university_data_collection_report.md` documents `28` FAQ records (`15 VERIFIED + 13 PENDING_VERIFICATION`), whereas `college_faq.json` (lines 1–319) and `docs/five_college_data_collection_report.md` now contain `30` records (`15 VERIFIED + 15 PENDING_VERIFICATION`).

**Exact Cause:** Records `#1`–`#28` in `college_faq.json` preserve the exact original `15 VERIFIED` and `13 PENDING_VERIFICATION` entries verbatim, and **2 new `PENDING_VERIFICATION` records** were appended at positions `#29` and `#30` to standardize all 5 colleges at `30` records each:

1. **Record #29 (`anti_ragging`, `PENDING_VERIFICATION`):**
   - **Question:** `"What anti-ragging committee details and campus helplines are published by NRI University?"`
   - **Source:** `https://rvrnriuniversity.edu.in/contact-us/`
2. **Record #30 (`mess_and_bus_timetable`, `PENDING_VERIFICATION`):**
   - **Question:** `"What are the bus routes, transport timings, and hostel mess schedule at NRI University?"`
   - **Source:** `https://rvrnriuniversity.edu.in/contact-us/`

**Remaining Sync Issues Found:**
- `docs/nri_university_data_collection_report.md` was not updated and still reports `28` total / `13` pending FAQs.
- Both `#29` and `#30` carry `last_verified: "2026-11-11"` even though `college_faq.json` was updated during the `2026-11-12` integration (while `college_002`–`college_005` use `"2026-11-12"`).

---

## 3. Source URL Availability & `official_sources` Sync Audit

### 3.1 Live HTTP Status Check (`68` Unique URLs Across Datasets)

| HTTP Result | Count | URL & Usage |
| :--- | ---: | :--- |
| **HTTP `200 OK`** | **67** | All `college_001` (`3`), `college_003` (`18`), `college_004` (`18`), and `college_005` (`13`) URLs, plus `15 / 16` `college_002` URLs. |
| **HTTP `404 Not Found`** | **1** | `https://www.srmap.edu.in/financial-aid-and-scholarship/` — used as `source` on `college_002` `PENDING_VERIFICATION` `[scholarships]` (*"What are the B.Tech domestic scholarship slabs..."*). |

### 3.2 Unsynced `official_sources` in `colleges.json` and `five_college_data_collection_report.md`

Several valid URLs cited in `college_faq.json` `source` fields were omitted from `colleges.json["official_sources"]` and/or `docs/five_college_data_collection_report.md`:

- **`college_002` (`SRMAP`):** `colleges.json` lists `9` `official_sources`; the report lists `11`; `college_faq.json` cites `15` unique URLs. **Omitted from `colleges.json` (`7`):** `admission/psb-bba-tuition-fee/`, `admission/psb-mba-programme/`, `admission/seas-mtech-programme/`, `financial-aid-and-scholarship/` (404), `international-relations/internships/`, `life-at-srmap/sports/`, `life-at-srmap/transportation/`.
- **`college_003` (`KLU`):** `colleges.json` lists `15`; the report lists `16`; `college_faq.json` cites `13`. **Omitted from both `colleges.json` and the report (`3`):** `pdfs/umd.pdf` (cited by 3 FAQs: `admissions`, `syllabus`, `examinations`), `pdfs/antiragging.pdf` (cited in report, missing from `colleges.json`), and `sports/default.aspx` (missing from both `colleges.json` and the report's official-sources list). Conversely, `PGProgrames.aspx`, `howto1.aspx`, `programmes.aspx`, and `pdfs/dis.pdf` are in `colleges.json` / report without being cited in any FAQ `source`.
- **`college_004` (`SAHE`):** `colleges.json` and report list `13`; `college_faq.json` cites `16`. **Omitted (`5`):** `https://admissions.siddhartha.edu.in/`, `academic-calendar/`, `academic-regulations/`, `central-facilities/`, `schools/`. Meanwhile `Proforma-of-Public-Self-Disclosure.pdf` is in `official_sources` without any FAQ citing it.
- **`college_005` (`PVPSIT`):** `colleges.json` and report list `12`; `college_faq.json` cites `13`. **Omitted (`1`):** `https://www.pvpsiddhartha.ac.in/examination_section.html`.

---

## 4. Source-by-Source Accuracy, Academic Year & Priority Topic Audit

### 4.1 `college_002` — SRM University-AP (`SRMAP`)

1. **SRM Tuition Fees (`seas-btech-tuition-fee/`, `psb-bba-tuition-fee/`) — No Academic Year Published + Ambiguous B.Tech Tables:**
   - **Verified numbers:** `Rs. 4,00,000/yr` (CSE Core/General, AI & ML, Big Data, Cyber Security, Distributed & Cloud Computing), `Rs. 4,75,000/yr` top table vs `Rs. 4,60,000/yr` second schedule (CSE AI & Future Technologies; Product Engineering with AI), `Rs. 3,00,000/yr` (ECE), PSB BBA `Rs. 2,55,000/yr`, plus Indian additional charges `Rs. 10,000` non-refundable registration + `Rs. 5,000` refundable caution deposit — all verified verbatim on the two pages.
   - **Audit Gaps:**
     - Neither `seas-btech-tuition-fee/` nor `psb-bba-tuition-fee/` publishes an academic year (`2026–27` is **not** stated; the site footer shows `© 2026` and `Admissions 2027` links, and the BBA scholarship scheme notes `Instituted in the year 2023`). The FAQ answers correctly omit `"2026-27"`, so no false year was fabricated, **but** they do not warn prospective applicants that the published schedule lacks an explicit academic-year header and `seas-btech-tuition-fee/` leaves EEE, ME, CE, Defence, Semiconductor, Quantum, and AI tuition fees blank in the scraped first table while showing two differing figures (`Rs. 4,75,000` vs `Rs. 4,60,000`) on the same page.
2. **PSB BBA Scholarships (`psb-bba-tuition-fee/`):**
   - `Rs. 67,500` (Category A), `Rs. 1,30,000` (Category B), `Rs. 1,91,250` (Category C), `"Conditions for renewal: None"` are verified verbatim.
   - **Minor Gap:** In the scraped HTML table, `Category A` prints a threshold only for `SAT (1300 - Above)` (other exam cells are blank) and `Category D` lists no reduced rupee tuition fee, whereas the FAQ groups Categories A–D across all exams.
3. **Placements & MBA Package Source Misattribution (`crcs-placement-tracker/` vs `psb-mba-programme/`):**
   - B.Tech/Overall CRCS tracker numbers (`677` companies in `2026*` vs `651`/`476`/`463`/`640`, `69.6%` IT/Software / `1,287` offers, `11.9%` Consulting, `734` >= `5 LPA` [`66.43%`], `206` >= `10 LPA` [`18.64%`], `98` >= `15 LPA`, `17` >= `40 LPA`, `1` >= `50 LPA`) and internship stipends (`Rs. 2,25,000` highest, `Rs. 26,200` overall avg, `Rs. 10,000` min, `2026` batch avg `Rs. 31,320`) **match `crcs-placement-tracker/` verbatim**. Note that `2026*` is an ongoing cycle (`Real-Time Placement Tracker — Class of 2026`).
   - **Audit Error (Source Misattribution & Potential Conflict):** In `[placements]` Q2 (*"What salary package tiers..."*), the second sentence (`"For Paari School of Business MBA, the current second batch average package is Rs. 9 LPA with recruiters including Deloitte, PwC, and BNY Mellon"`) is **not** on the cited `crcs-placement-tracker/` page (which shows `MBA - Management (₹7.23 LPA)` for 2021–2026); it comes from `psb-mba-programme/`, where `"current MBA second batch"` is also undated.
4. **Unsupported Bus Route List (`"Tenali"` Cross-Contamination) & Metadata Errors:**
   - **High Priority Error:** Both `colleges.json` (`campus_life.facilities` and `mess_and_bus_timetable`) and `docs/five_college_data_collection_report.md` (Section 2.2) state SRM-AP buses cover **`Vijayawada, Guntur, Tenali, and Mangalagiri`**. Across all scraped SRM-AP files, **`"Tenali"` appears `0` times**; `srmap.edu.in/life-at-srmap/transportation/` states only `"various places near the campus... villages as well as cities"` and publishes annual transport fees (`Rs. 68,000` / `Rs. 72,000` / `Rs. 75,000` across distance bands, alongside a second SEAS table showing repeated `01 - 30 Kms` labels at `Rs. 60,000 / 65,000 / 70,000`). The `"Vijayawada, Guntur, Tenali, Mangalagiri"` city list appears to be unintended carry-over from KLU (`transp.aspx`), though the SRM-AP FAQ itself stayed conservative (`"major nearby cities and towns"`).
   - `colleges.json` `academics.syllabus_links` erroneously points to `https://www.srmap.edu.in/admission/seas-btech-tuition-fee/`.
   - Other minor source mismatches in `college_002` FAQs: `[contact_info]` Library/Student Affairs cites `library/`, whereas Student Affairs helpline `9154947156` is only on `anti-ragging-committee/`; `[facilities]` cites `transportation/` for `"10 SEAS departments"` (from `admission/`), while omitting the published bus fee slabs on `transportation/`.

---

### 4.2 `college_003` — KL Deemed to be University (`KLU`)

1. **2026–27 Tuition Fees (`sships3.aspx`) & 2026–27 Hostel Charges (`hfee.aspx`):**
   - **Verified Accurate:** Every fee figure matches `sships3.aspx` (`UG & PG Fee Structure FOR The Academic Year-2026-2027`, Vijayawada Campus, per-semester rates, `+ Rs. 17,500` ACCA/CMA fee, `Rs. 16,000` one-time admission fee waived for alumni) and `hfee.aspx` (`Hostel Fee particulars for the Academic Year 2026-27 (Vaddeswaram Campus)`: `Rs. 92,000` mess + `5% GST Rs. 4,600` + room rent totaling `Rs. 1,34,100` to `1,49,100` for Non-AC & `1,44,100` for AC Common 4-Bed; `Rs. 5,000` registration; `Rs. 4,000`/`12,000` electricity deposit; 1/2/3 instalments; Lotus & Himalaya Girls Hostels).
2. **Scholarships & Renewal Rules (`sships3.aspx`, `cb2.pdf`):**
   - **Verified Accurate:** KLEEE-2026 and JEE Mains slabs (`CSE >=95%` / `KLEEE 1–100` -> `50%` = `Rs. 73,750/sem`, `101–25,000` across slabs, up to `75,000` for `CE/ME/EEE`), special annual awards (`Rs. 10,000/yr` SC/ST/PwD/Siblings/Single Girl Child/KL Alumni children/Ex-Army; `Rs. 5,000/yr` OBC; `100%/50%/25%` International/National/State sports medalists), and CGPA continuation (`>=9.0`, `>=8.0`, `>=7.5` with zero backlogs and no indiscipline) are verified verbatim. Minor note: the special-scholarship FAQ cites `cb2.pdf`, where `OBC Rs. 5,000` says `Rs. 5000/-` and `Ex-Army` lacks the `Rs.` prefix, whereas `sships3.aspx` formats both cleanly.
3. **Placement Statistics Missing Reporting Year (`cb2.pdf`):**
   - `Rs. 81 LPA` Highest CTC, `Rs. 7.25 LPA` Engineering Median CTC, `5,000+` placed in a single academic year, `6,500+` job offers, `500+` global companies, `370+` engineering companies, `12,000+` internships in `2024–25`, and `31+` international internships match `cb2.pdf` (`Counselling 2026`).
   - **Audit Gap:** `cb2.pdf` does **not** specify which placement year produced `Rs. 81 LPA`, `Rs. 7.25 LPA`, `5,000+` placed, or `6,500+` offers (only `12,000+` internships explicitly specifies `2024–25`). While the FAQ quotes `cb2.pdf` accurately, labeling the placement metrics as `"according to the 2026 Counselling Booklet (exact placement cycle year unspecified in brochure)"` would prevent misinterpreting them as 2026-batch outcomes.
4. **Source-Page Attribution Gaps (`college_003`):**
   - `[facilities]` cites `transp.aspx` for `Rs. 25,000` base bus fee, which actually comes from `cb2.pdf`.
   - `[contact_info]` cites `contact.aspx` for Admissions Director mobile `949 036 1111`, which is on `cb2.pdf` rather than `contact.aspx`.
   - `[principal_info]` cites `contact.aspx` while referencing `"2025–26 Mandatory Disclosure"` and VC mobile `9948033033` (both from `dis.pdf`; `contact.aspx` lists `Dr. G.P.S. Varma` without mobile number).
   - `[contact_info]` (`placem.aspx`) includes `coe@kluniversity.in` / CoE Dr. A.S.C.S. Sastry (located on `contact.aspx` and `umd.pdf`, not `placem.aspx`).
   - `[sports]` cites `sports/default.aspx` for `100%/50%/25%` medalist fee waivers (published on `sships3.aspx` and `cb2.pdf`).

---

### 4.3 `college_004` — Siddhartha Academy of Higher Education (`SAHE`)

1. **2026–27 Intakes, Tuition Fees & Merit Scholarships (`academic-programs/`, `Fee-details.pdf`, `scholarships/`):**
   - **Verified Accurate:** `2026–27` B.Tech/PG/Law/Management intakes (`CSE 420`, `ECE 240`, `AI&DS 180`, `AI&ML 180`, `EEE 120`, `EIE 120`, `CE 60`, `ME 60`, `LL.B. 180`, `BA LL.B. 120`, `BBA 60`, `BBA LL.B. 60`, `B.Sc. CS 60`, `B.Com CA 40`, `MBA 60`, `MCA 60`, `M.Tech 6x12=72`, `LL.M. 2x20=40`), `2026–27` regular (`Rs. 2,50,000` / `1,65,000` / `1,00,000 + 10,000`) and lateral-entry (`Rs. 2,50,000` / `2,25,000 IT` / `1,65,000` / `90,000 + 5,000`) & PG/UG fees, and `2026–27` merit scholarship tiers (`30%` cap, `10%–100%` waivers, `75%` attendance & `7.5` CGPA renewal) match verbatim.
   - **Minor Course-List Nuance:** `[courses]` lists `Information Technology` while citing `academic-programs/`, yet `academic-programs/` (`2026-27`) omits `B.Tech IT` from fresh first-year B.Tech intake (IT appears under `Fee-details.pdf` Lateral Entry `2026-27`, Minors eligibility, `ug-programs/`, and `school-of-eng/`).
2. **Placements Reporting Error & Missed Published Highest CTC (`placements/statistics/`):**
   - **High Priority Finding (1 — Misleading Multi-Year Label):** The `VERIFIED` FAQ (*"Which major IT and core companies recruit..."*) labels **`TCS (251), Capgemini (213), Accenture (210), Infosys (169), LTI Mindtree (152), Cognizant (140), HCL (131)...`** as **`"top multi-year offer volumes"`**. Inspection of `siddhartha.edu.in/placements/statistics/` shows four year tabs (`2025-26`, `2024-25`, `2023-24`, `2022-23`) immediately above that first table (`Total 1920*`), followed by separate tables for the other year tabs (e.g., the second table lists `Accenture 264`, `TCS 364`, `Total 1203`). Thus `TCS (251)` represents one year tab (rather than a multi-year aggregate), and lacks an explicit year label.
   - **High Priority Finding (2 — Highest Salary Package Actually Published):** The `PENDING_VERIFICATION` FAQ (*"What is the verified highest and average salary package..."*) and `five_college_data_collection_report.md` report that highest CTC could not be verified because top-banner counters loaded dynamically as `'0+'`. However, directly below on the same page under **`COMPANY WISE / BRANCH WISE PLACEMENT DETAILS FOR THE ACADEMIC YEAR 2025-26`**, static HTML rows explicitly publish **`Amazon: 48` (LPA)** and **`Myntra: 35.50` (LPA)** alongside `Wells Fargo (21.73)`, `JP Morgan Chase (19.75)`, `AT&T (19)`, `Myntra (18.00)`, `Infosys SP-L2 (16)`, `Sobha Constructions (14.50)`, and `Morgan Stanley (13.78)`. Therefore, `2025–26` highest CTC (`Rs. 48 LPA`) is verifiable from the fetched static page, whereas only the **overall average CTC** and dynamic counter totals remain unprinted.
3. **Source-Page Attribution Gaps (`college_004`):**
   - `[courses]` accreditations (`NAAC 'A+' 2021`, `five cycles NBA since 1998`, `ISO 21001:2018`, `top-200 NIRF`) cite `schools/`, whereas those facts reside on `overview/`.
   - `[examinations]` cites `academic-calendar/`, while `9347541371` and `verifications@vrsiddhartha.ac.in` (`Extn 106, 116`) reside on `contact-us/` (missing from `academic-calendar/`).

---

### 4.4 `college_005` — PVP Siddhartha Institute of Technology (`PVPSIT`)

1. **PVP 2024–25 Tuition Fees & Intakes (`Compliance-MandatoryDisclosures-PVPSIT_2024-25.pdf`, `feestructure.html`, `programesoffered_n.html`):**
   - **Verified Accurate:** Section 6.3 of the `2024–25` Mandatory Disclosure explicitly lists `B.Tech I & II: Rs. 1,05,000`, `III: Rs. 77,000`, `IV: Rs. 70,000`, `MBA I & II: Rs. 60,000`, `M.Tech I & II: Rs. 90,000`, and `APHERMC` refund policy; `feestructure.html` lists `₹ 1,05,000` Category-A Convenor quota for all 8 B.Tech branches plus MBA `₹ 60,000` and M.Tech `₹ 90,000` (with no year header on `feestructure.html` and a minor PVPSIT-website label quirk calling PG `"Category-A (APEAPCET)"`).
   - **Intake Nuance Verified:** Mandatory Disclosure (`2024–25` Sections 3.1 & 6.2) lists `780` B.Tech (`CSE 240, ECE 120, IT 120, EEE 60, ME 60, CE 60, CSE-AI&ML 60, CSE-DS 60`) `+ 78 EWS = 858`, `MBA 60 (+6 EWS)`, `M.Tech 12 (6+6, +2 EWS)`; the FAQ accurately notes that `programesoffered_n.html` shows `180` for CSE-AI&ML.
2. **Placements (`2025–26` & 5-Year Trend), Scholarships & Hostels (`department_tp.html`, `MD`, `hostel.html`):**
   - **Verified Accurate:** `2025–26` placements (`1,124` offers, `87+` companies, `Rs. 48 LPA` highest, exact branch breakdown `CSE 254, ECE 166, MECH 148, IT 121, EEE 99, AIML 91, DS 91, CIVIL 66, MBA 88`), 5-year totals (`1,124 / 1,081 / 1,055 / 960 / 1,119`), `189` internships, UIF financial aid (`50%` of registration Rs. `1,68,000` for 4 students at Stanford + Twente travel support of `Rs. 1,32,499` for 1 student and `Rs. 5,81,194` for 4 students), and Girls/Boys hostel addresses, capacities, amenities, and visiting hours match verbatim.
3. **Source-Page Attribution Gaps (`college_005`):**
   - `[contact_info]` Q1 cites `contact_us_new.html` while including `Central Library extn. 104` (only on `library.html`).
   - `[contact_info]` Q2 cites `contact_us_new.html` while providing T&P mobile `9246620777` (on `department_tp.html`) and Hostel Warden phone numbers `9493106040`, `7095699862`, `9866007876` (only on `hostel.html`).

---

## 5. Pending-Information Separation & Hybrid Record Check

All `33` `PENDING_VERIFICATION` records explicitly state `PENDING_VERIFICATION` and never invent missing values. However, **5 `VERIFIED` FAQ records** embed `"PENDING_VERIFICATION"` caveats directly inside a `VERIFIED` answer:

| `college_id` | Category | Question | Embedded Caveat |
| :--- | :--- | :--- | :--- |
| `college_002` | `principal_info` | Who is the Vice-Chancellor and academic leadership of SRM University-AP? | `"...complete Head of Institution / HOD contact directory remains partially PENDING_VERIFICATION."` |
| `college_003` | `library` | What Central Library services does KL Deemed to be University provide? | `"Specific exact current volume/timing counts were not printed in HTML and remain partially PENDING_VERIFICATION."` (also embeds raw URL `https://www.kluniversity.in/lib/` while `source` is `/lib/default.aspx`) |
| `college_004` | `facilities` | What campus central facilities and transportation does SAHE offer? | `"(exact campus bus routes and timetable remain PENDING_VERIFICATION)."` |
| `college_005` | `fees` | What is the B.Tech tuition fee structure at PVP Siddhartha Institute of Technology? | `"Note that APHERMC-revised 2026–27 Category-A/Category-B schedules... remain PENDING_VERIFICATION for fresh 2026–27 admissions."` |
| `college_005` | `facilities` | What laboratories, internet, and college bus transport facilities are available at PVPSIT? | `"...dedicated college bus routes and transport timings were not published... and remain PENDING_VERIFICATION."` |

Additionally, `dataset/processed/dataset_summary.json` retains legacy Phase 1 entries under `pending_college_specific_information` (such as `"Verified hostel mess timetable and bus route schedule (replace unverified demo GitHub URL)"` and listing verified categories like `admissions` and `courses`), creating an inconsistency with the updated `colleges_summary` block.

---

## 6. Separation Check: `college_004` (`SAHE`) vs `college_005` (`PVPSIT`)

- **IDs, URLs, Leadership, Contacts & Logos:** Completely separated (`siddhartha.edu.in` / `vrsiddhartha.ac.in` + `college_004.jpg` vs `pvpsiddhartha.ac.in` + `college_005.png`). Zero data cross-merge or domain mix-up was found between `SAHE` and `PVPSIT`.
- **Intentional Cross-Mention Disambiguation Strings (`3` FAQs):**
  - `college_004` `[college_location]`: `"...separate from PVPSIT"`
  - `college_005` `[courses]`: `"...(distinct from Siddhartha Academy of Higher Education)"`
  - `college_005` `[college_location]`: `"...(distinct from Siddhartha Academy of Higher Education)"`
  - **Audit Note:** While intended to clarify two Kanuru colleges with `"Siddhartha"` in their names, containing sibling-college acronyms/names inside `answer` text can trigger strict keyword-isolation audits (`PVPSIT` appearing in `college_004` and vice versa).

---

## 7. Workspace Modification Inventory (`2026-11-12`)

During this audit, `0` workspace files were modified prior to creating this report. The `23` project files already modified on `2026-11-12` (between `16:44:08` and `17:25:23`) are:

- **Datasets (`3`):** `dataset/processed/colleges.json`, `dataset/processed/college_faq.json`, `dataset/processed/dataset_summary.json`
- **Backend & Tests (`5`):** `backend/app/utils/schemas.py`, `backend/app/services/data_store.py`, `backend/app/services/postgres_repository.py`, `backend/tests/test_colleges_api.py`, `backend/tests/test_chat_api.py`
- **Frontend Assets (`5`):** `frontend/public/logos/college_001.png`, `college_002.png`, `college_003.png`, `college_004.jpg`, `college_005.png`
- **Frontend Code, Types & Tests (`8`):** `frontend/src/types/api.ts`, `frontend/src/components/CollegeAvatar.tsx`, `frontend/src/components/CollegeSelector.tsx`, `frontend/src/components/ChatWindow.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/pages/LandingPage.tsx`, `frontend/src/__tests__/App.test.tsx`, `frontend/tsconfig.tsbuildinfo`
- **Documentation (`2`):** `docs/five_college_data_collection_report.md`, `README.md`

---

## 8. Prioritized Recommendations (Unapplied — Awaiting User Approval)

1. **Remove Unsupported SRM-AP Bus City Claim (`High`):** Replace `"Vijayawada, Guntur, Tenali, and Mangalagiri"` in `colleges.json` (`college_002` `institutional_data.campus_life`) and `docs/five_college_data_collection_report.md` with `"nearby cities and villages (route-wise pickup PDF unextracted; published annual fees Rs. 68,000–75,000 / Rs. 60,000–70,000 depending on distance/schedule)"`.
2. **Correct SAHE (`college_004`) Placement Statistics & Highest Package (`High`):**
   - Update `college_004` `PENDING_VERIFICATION` `[placements]` FAQ (and `colleges.json` + report) to report the verified **`2025–26` highest pay package of `Rs. 48 LPA` (Amazon)** and `Rs. 35.50 LPA` (Myntra) from the static `placements/statistics/` table, leaving only aggregate **average CTC** and dynamic total counters as `PENDING_VERIFICATION`.
   - Correct `"top multi-year offer volumes"` in `college_004` `VERIFIED` `[placements]` FAQ after confirming in live rendered DOM whether the first company-wise table (`TCS 251`, `Total 1920*`) corresponds to `2025-26` or another single tab.
3. **Replace Broken `404` URL in `college_002` (`Medium`):** Change `college_002` `[scholarships]` `PENDING_VERIFICATION` `source` from `https://www.srmap.edu.in/financial-aid-and-scholarship/` (`404`) to `https://www.srmap.edu.in/admission/` or `https://www.srmap.edu.in/admission/seas-btech-tuition-fee/`.
4. **Fix Source Attribution Mismatches & Add Missing URLs (`Medium`):**
   - Split or re-point the misattributed facts (`college_002` MBA `Rs. 9 LPA` -> `psb-mba-programme/`, Student Affairs `9154947156` -> `anti-ragging-committee/`; `college_003` bus `Rs. 25,000` -> `cb2.pdf`, CoE -> `contact.aspx`/`umd.pdf`, VC mobile -> `dis.pdf`; `college_004` accreditations -> `overview/`, exam enquiry phone -> `contact-us/`; `college_005` library extn -> `library.html`, warden mobiles -> `hostel.html`).
   - Add all FAQ-cited URLs to `colleges.json["official_sources"]` and `docs/five_college_data_collection_report.md`, and fix `college_002` `academics.syllabus_links` (`PENDING_VERIFICATION`).
5. **Qualify Undated Fee & Placement Figures (`Medium`):**
   - Explicitly note on SRM-AP `seas-btech-tuition-fee/` & `psb-bba-tuition-fee/` FAQs that **no academic year header is printed on the website**, note the `Rs. 4,75,000` vs `Rs. 4,60,000` dual schedule on the B.Tech fee page, and note unprinted non-CSE/ECE branch fees.
   - Qualify KL University `cb2.pdf` placement figures (`Rs. 81 LPA`, `Rs. 7.25 LPA`, `5,000+` placed, `6,500+` offers) as **reported in Counselling 2026 booklet without an explicit placement-year label**.
6. **Clean Up Legacy & Semantic Hybrids (`Low`):**
   - Decide whether to keep `"PENDING_VERIFICATION"` notes inside the `5` hybrid `VERIFIED` FAQs (and remove raw `https://www.kluniversity.in/lib/` inside `college_003` library text) and whether to strip sibling-institution cross-mentions (`SAHE` <-> `PVPSIT`) in `college_004` / `college_005` FAQ bodies.
   - Update `docs/nri_university_data_collection_report.md` (`28` -> `30`), align `last_verified` on NRI `#29`–`#30` (`2026-11-12` if appropriate), and remove stale Phase 1 `demo GitHub URL` notes from `dataset_summary.json`.

