# Five-College Dataset & Documentation Correction Report

**Date:** `2026-11-12`  
**Scope:** Controlled corrections applied per [five_college_data_audit_report.md](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/docs/five_college_data_audit_report.md) across `college_001`–`college_005` datasets and documentation, without retraining or modifying the NLP model or changing backend/frontend architecture or API contracts.

---

## 1. Updated FAQ & Verification Counts per College

All five institutions remain strictly separated under their canonical `college_id`s with `30` records each (`150` FAQs total, `0` schema errors, `0` duplicate `(college_id, question)` pairs, `0` cross-college leaks):

| `college_id` | Short Code | Institution | Total FAQs | `VERIFIED` | `PENDING_VERIFICATION` | Synced `official_sources` URLs |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: |
| `college_001` | `NRIU` | NRI University | 30 | 15 | 15 | 3 |
| `college_002` | `SRMAP` | SRM University-AP | 30 | 23 | 7 | 18 |
| `college_003` | `KLU` | KL Deemed to be University | 30 | 28 | 2 | 18 |
| `college_004` | `SAHE` | Siddhartha Academy of Higher Education | 30 | 25 | 5 | 18 |
| `college_005` | `PVPSIT` | Prasad V Potluri Siddhartha Institute of Technology | 30 | 26 | 4 | 13 |
| **Total** | **5 Colleges** | — | **150** | **117** | **33** | **70 unique URLs (`60` FAQ sources)** |

---

## 2. Corrections Applied (Before → After Summary)

### 2.1 `college_001` — NRI University (`NRIU`)
- **FAQs (`college_faq.json`):** Preserved all `30` records (`15 VERIFIED` + original `13 PENDING_VERIFICATION` + `#29 anti_ragging` + `#30 mess_and_bus_timetable`) unchanged; no pending records were marked verified.
- **Documentation ([nri_university_data_collection_report.md](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/docs/nri_university_data_collection_report.md)):** Updated from `28` (`15 VERIFIED`, `13 PENDING_VERIFICATION`) to `30` (`15 VERIFIED`, `15 PENDING_VERIFICATION`), documenting appended pending records `#29 anti_ragging` and `#30 mess_and_bus_timetable` (`last_verified: 2026-11-11`).

### 2.2 `college_002` — SRM University-AP (`SRMAP`)
- **CSE Specialization & B.Tech Tuition Schedule (`FAQ [39]`, `colleges.json`):** Live Elementor DOM inspection on `https://www.srmap.edu.in/admission/seas-btech-tuition-fee/` (`HTTP 200`) confirmed that the visible fee table (`data-id="022546c"`, supplemented by `e923f06`) lists:
  - `Rs. 4,50,000/yr`: CSE (Core/General, AI & ML), Artificial Intelligence, Quantum Computing & Engineering, Financial Engineering
  - `Rs. 4,00,000/yr`: CSE (Cyber Security, Big Data Analytics, Distributed & Cloud Computing)
  - `Rs. 4,75,000/yr`: CSE (AI and Future Technologies), CSE (Product Engineering with AI)
  - `Rs. 3,00,000/yr`: ECE
  - `Rs. 2,50,000/yr`: Mechanical, EEE, Civil, Health, Defence, Energy, and Semiconductors Engineering
  - Meanwhile, widget `data-id="1cb310d"` (`elementor-hidden-desktop elementor-hidden-tablet elementor-hidden-mobile`) holds legacy lower amounts (`CSE Rs. 4,00,000`, `Cyber/Big Data/Cloud/IoT Rs. 3,60,000`, `AI & Future Technologies / Product Engg with AI Rs. 4,60,000`, `ECE Rs. 2,50,000`), and the heading `"B.Tech. Yearly Tuition Fees"` prints **no academic year**. Updated FAQ `[39]` and `colleges.json` (`fees_and_aid.fees`) to present the visible schedule cleanly while documenting both the hidden responsive block and the missing year label. Also refined `[39]` question phrasing (`B.Tech (BTech CSE, ECE, and Engineering)`) for TF-IDF tokenization.
- **Broken Scholarship URL Replaced (`FAQ [43]`):** Replaced the `HTTP 404` URL (`https://www.srmap.edu.in/financial-aid-and-scholarship/`, while `?page_id=38864` and `seas-btech-scholarship/` also return `HTTP 404`) with the live `HTTP 200` page `https://www.srmap.edu.in/admission/financial-aid/`. Retained `verification_status = "PENDING_VERIFICATION"` because domestic B.Tech scholarship percentage slabs and current SRMJEEE rank cutoffs are not published on `admission/financial-aid/` or `admission/financial-aid/seas-scholarships/` (archived criteria show 2021 rules).
- **Tenali Bus Route & 2026–27 Transport Clarification (`FAQ [53]`, `colleges.json`):** Re-verification located both the 14-page `SRM-UNIVERSITY-AP-transport.pdf` (routes `G1–G11`, `V1–V14`, `TD1`, and `TN1–TN2` including Jagarlamudi, Auglakuthru, Chenchupeta, Nandhivelugu, Duggirala, Peddavadlapudi, Mangalagiri) and `https://www.srmap.edu.in/admission/seas-transportation-fee/` (`HTTP 200`), which explicitly states: *"A student can be a day boarder and can avail of transport facilities from Vijayawada, Guntur, Tadepalli, Tenali and Raintree Park"* alongside `2026–27` full-year fees (`Rs. 68,000` for `1–30 km`, `Rs. 72,000` for `31–60 km`, `Rs. 75,000` for `61+ km`). Re-pointed FAQ `[53]` to `seas-transportation-fee/` and updated `colleges.json` (`campus_life.facilities` and `mess_and_bus_timetable`) with explicit source attribution.
- **MBA Placement Attribution Split (`FAQ [44]`, `FAQ [45]`, `FAQ [46]`, `colleges.json`):** Separated CRCS tracker statistics from Paari School of Business (PSB) MBA page statistics:
  - `FAQ [45]` (`crcs/crcs-placement-tracker/`): Removed the misattributed PSB MBA `Rs. 9 LPA` claim and retained `2026*` tiers (`Highest Rs. 55 LPA`, `734 >= Rs. 5 LPA`, `206 >= Rs. 10 LPA`, `98 >= Rs. 15 LPA`, `17 >= Rs. 40 LPA`, `1 >= Rs. 50 LPA`) plus `2021–2026` tracker averages (`Rs. 9.20 LPA` CSE, `Rs. 7.23 LPA` MBA Management).
  - `FAQ [46]` (`admission/psb-mba-programme/`): Dedicated to PSB MBA (`Rs. 9 LPA` average package so far for the current second MBA batch; Deloitte, PwC, Human Resocia, BNY Mellon).
- **Page-Exact Attribution & Embedded Caveat Cleanup (`FAQ [56]`, `FAQ [57]`, `FAQ [58]`, `FAQ [59]`):**
  - Stripped cross-page Student Affairs details from `[56]` (`about-us/contact-us/`) and `[57]` (`life-at-srmap/library/`), keeping Student Affairs helpline `9154947156` / `student.affairs@srmap.edu.in` strictly under `[59]` (`anti-ragging-committee/`).
  - Re-pointed `[58]` (`principal_info`) to `https://www.srmap.edu.in/about-us/contact-us/` and removed embedded `PENDING_VERIFICATION` text from the verified answer.
- **Metadata (`colleges.json`):** Set `academics.syllabus_links` from a tuition-fee link to `"PENDING_VERIFICATION"`, synced all `18` `official_sources`, and updated `fees`, `placement_statistics`, `facilities`, and `mess_and_bus_timetable`.

### 2.3 `college_003` — KL Deemed to be University (`KLU`)
- **Placement Reporting Period Qualified (`FAQ [74]`, `colleges.json`):** Explicitly qualified `Rs. 81 LPA` highest CTC, `Rs. 7.25 LPA` Engineering median CTC, `5,000+` placed in a single academic year, and `6,500+` job offers as coming from the **2026 Counselling Booklet (`cb2.pdf`), which does not specify the exact placement cycle year for these overall figures** (no batch year invented).
- **Source-Strict Text & Cleanup (`FAQ [68]`, `[82]`, `[83]`, `[84]`, `[86]`, `[87]`, `[88]`):**
  - `[82]` (`lib/default.aspx`): Removed raw inline `https://www.kluniversity.in/lib/` URL and embedded `PENDING_VERIFICATION` text from the verified record.
  - `[83]` (`transp.aspx`): Removed off-page `cb2.pdf` `Rs. 25,000` transport fee claim so every fact in `[83]` matches `transp.aspx`.
  - `[84]` (`sports/default.aspx`): Removed off-page sports fee-waiver numbers (already verified under `[73]`).
  - `[86]` (`contact.aspx`), `[87]` (`placem.aspx`), `[88]` (`contact.aspx`), `[68]` (`pdfs/umd.pdf`): Aligned contacts, CoE, Practice School phones/emails, and leadership purely with each cited page.
- **Metadata (`colleges.json`):** Added missing FAQ URLs (`pdfs/antiragging.pdf`, `pdfs/umd.pdf`, `sports/default.aspx`) to `official_sources` (`18` total), updated `placement_statistics` and `library_details`.

### 2.4 `college_004` — Siddhartha Academy of Higher Education (`SAHE`)
- **2025–26 Placement Statistics & Highest CTC Fixed (`FAQ [104]`, `FAQ [105]`, `colleges.json`):**
  - Corrected `[104]` (`VERIFIED`, `placements/statistics/`): Replaced `"multi-year offer volumes"` with the exact **2025–26** placement cycle records (**`1,920*` total offers** led by TCS `251`, Capgemini `213`, Accenture `210`, Infosys `169`, LTI Mindtree `152`, Cognizant `140`, HCL Technologies `131`, Delphi TVS `106`, Brakes India `64`, Megha Engineering `57`, Transenergy-TVS `55`, TVS Sundaram Fasteners `54`, Deloitte `8`, JP Morgan Chase `6`) and reported published `2025–26` branch-wise highest packages (**Amazon `Rs. 48 LPA`**, **Myntra `Rs. 35.50 LPA`**, Wells Fargo `Rs. 21.73 LPA`, JP Morgan Chase `Rs. 19.75 LPA`). Added `"2025-26"` and `"highest packages"` to `[104]` question phrasing for accurate retrieval.
  - Updated `[105]` (`PENDING_VERIFICATION`, `placements/statistics/`): Clarified that `2025–26` company offer counts (`1,920*`) and top packages (`Rs. 48 LPA` Amazon, `Rs. 35.50 LPA` Myntra) ARE published statically, whereas an **overall average CTC / consolidated placement percentage** is not published and top-banner summary counters loaded as `'0'` statically.
- **2026–27 B.Tech Course List & Page-Strict Attribution (`FAQ [90]`, `[94]`, `[96]`, `[98]`, `[113]`, `[115]`):**
  - `[94]` (`academic-programs/`) & `colleges.json` (`courses_offered`): Aligned `2026–27` regular 4-year B.Tech list to the `8` regular intake branches (`CSE`, `CSE (AI & DS)`, `CSE (AI & ML)`, `ECE`, `EEE`, `EIE`, `Civil`, `Mechanical`; B.Tech IT appears under Lateral Entry / Minors / `school-of-eng/`).
  - `[90]`: Removed duplicate raw portal URL inside answer text.
  - `[96]` (`schools/`), `[98]` (`academic-calendar/`), `[113]` (`central-facilities/`): Matched cited pages strictly and removed embedded `PENDING_VERIFICATION` disclaimer from `[113]`.
  - `[115]` (`college_location`): Removed cross-college reference (`"separate from PVPSIT"`).
- **Metadata (`colleges.json`):** Added `admissions.siddhartha.edu.in/`, `academic-calendar/`, `academic-regulations/`, `central-facilities/`, `schools/` to `official_sources` (`18` total); updated `courses_offered` and `placement_statistics`.

### 2.5 `college_005` — PVP Siddhartha Institute of Technology (`PVPSIT`)
- **2024–25 Historical Fees vs Unpublished 2026–27 Schedule (`FAQ [129]`, `[130]`, `[131]`, `colleges.json`):**
  - Labeled `[129]` (B.Tech I & II `Rs. 1,05,000`, III `Rs. 77,000`, IV `Rs. 70,000`) and `[130]` (MBA `Rs. 60,000/yr`, M.Tech `Rs. 90,000/yr`) explicitly as the published **2024–25** Mandatory Disclosure / Fee Structure Category-A Convenor schedule, removing embedded `PENDING_VERIFICATION` text from `[129]`. Updated `[129]` question phrasing (`B.Tech (BTech)`) for clean tokenization.
  - Refined `[131]` (`PENDING_VERIFICATION`) to handle APHERMC refund norms and unpublished `2026–27` newly admitted Category-A / Category-B (Management/NRI quota) tuition fee schedules.
- **Page-Strict Attribution, Hybrid & Cross-Mention Cleanup (`FAQ [126]`, `[143]`, `[145]`, `[146]`, `[147]`):**
  - `[126]` & `[145]`: Removed cross-college mentions of `Siddhartha Academy of Higher Education`.
  - `[143]` (`facilities`): Removed embedded `PENDING_VERIFICATION` bus-route caveat from the verified laboratories/campus amenities FAQ.
  - `[146]` (`contact_us_new.html`): Removed Library `extn. 104` (covered on `library.html` in `[142]`).
  - `[147]` (`hostel.html`): Re-pointed source from `contact_us_new.html` to `https://www.pvpsiddhartha.ac.in/hostel.html` for Girls/Boys hostel warden and supervisor contact numbers.
- **Metadata (`colleges.json`):** Added `examination_section.html` to `official_sources` (`13` total) and updated `fees_and_aid.fees`.

### 2.6 Global Dataset Summary & Reports
- **[dataset_summary.json](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/dataset/processed/dataset_summary.json):** Replaced stale Phase 1 `pending_college_specific_information` entries (removing `"replace unverified demo GitHub URL"`, etc.) with eight accurate five-college pending categories matching `150` schema records.
- **[five_college_data_collection_report.md](file:///d:/TechGlobal_Mini/AI-Student-Chatbot/docs/five_college_data_collection_report.md):** Synced Sections 2.2–2.5 `official_sources` and verified/pending summaries with the corrected JSON datasets (`15/15`, `23/7`, `28/2`, `25/5`, `26/4`).

---

## 3. Verified Official Sources Used

Every cited URL across `colleges.json` (`70` unique URLs) and `college_faq.json` (`60` unique FAQ `source` URLs) was live-checked and returned `HTTP 200 OK`:

- **`college_001` (`3` URLs):** `https://nriuniversity.in/`, `https://rvrnriuniversity.edu.in/admissions/`, `https://rvrnriuniversity.edu.in/contact-us/`
- **`college_002` (`18` URLs):** `srmap.edu.in/`, `about-us/contact-us/`, `admission/`, `admission/financial-aid/`, `admission/psb-bba-tuition-fee/`, `admission/psb-mba-programme/`, `admission/seas-btech-eligibility/`, `admission/seas-btech-tuition-fee/`, `admission/seas-mtech-programme/`, `admission/seas-transportation-fee/`, `anti-ragging-committee/`, `crcs/crcs-placement-tracker/`, `international-relations/internships/`, `life-at-srmap/accommodation/`, `life-at-srmap/library/`, `life-at-srmap/sports/`, `life-at-srmap/transportation/`, `wp-content/uploads/2025/05/SRM-UNIVERSITY-AP-transport.pdf`
- **`college_003` (`18` URLs):** `kluniversity.in/`, `PGProgrames.aspx`, `accr.aspx`, `contact.aspx`, `hfee.aspx`, `hostels/default.aspx`, `howto1.aspx`, `ips/default.aspx`, `lib/default.aspx`, `pdfs/antiragging.pdf`, `pdfs/cb2.pdf`, `pdfs/dis.pdf`, `pdfs/umd.pdf`, `placem.aspx`, `programmes.aspx`, `sports/default.aspx`, `sships3.aspx`, `transp.aspx`
- **`college_004` (`18` URLs):** `admissions.siddhartha.edu.in/`, `siddhartha.edu.in/`, `academic-calendar/`, `academic-programs/`, `academic-regulations/`, `anti-ragging/`, `central-facilities/`, `central-library/`, `contact-us/`, `deans/`, `hostels/`, `overview/`, `placements/statistics/`, `scholarships/`, `schools/`, `sports/`, `wp-content/uploads/2025/11/Proforma-of-Public-Self-Disclosure.pdf`, `wp-content/uploads/2026/01/Fee-details.pdf`
- **`college_005` (`13` URLs):** `pvpsiddhartha.ac.in/`, `academicregulations_n.html`, `admission_procedure.html`, `antiragging.html`, `contact_us_new.html`, `department_sport.html`, `department_tp.html`, `examination_section.html`, `feestructure.html`, `hostel.html`, `library.html`, `mandatory/Compliance-MandatoryDisclosures-PVPSIT_2024-25.pdf`, `programesoffered_n.html`

---

## 4. Unresolved, Undated & Remaining `PENDING_VERIFICATION` Items (`33` FAQs)

All items below remain explicitly documented rather than fabricated:

- **`college_001` (`NRIU`, `15` pending):** Tuition/semester fees (`admissions/`), scholarships, hostel charges, department HODs, examination schedules, placement stats/packages, internships, library timings, campus labs/amenities, sports facilities, required admission documents, branch-wise sanctioned intake, Principal/VC leadership roster, anti-ragging committee/helpline details (`#29`), and mess/bus timetables (`#30`).
- **`college_002` (`SRMAP`, `7` pending + qualification notes):**
  - Undated B.Tech/BBA fee headings and hidden legacy responsive fee HTML block on `seas-btech-tuition-fee/` (preserved with explicit caveats).
  - Unverified (`PENDING_VERIFICATION`): original admission document list (`seas-btech-eligibility/`), branch-wise sanctioned seat intake (`admission/`), SRMJEEE/program syllabus PDFs (`academics.syllabus_links` & `psb-mba-programme/`), exam calendar (`admission/`), unitemized domestic M.Tech & MBA tuition fees (`seas-mtech-programme/`), domestic B.Tech scholarship percentage slabs (`admission/financial-aid/`; sub-page returns `404` and archived page lists 2021 criteria), and itemized hostel/mess fees (`life-at-srmap/accommodation/`).
- **`college_003` (`KLU`, `2` pending + qualification note):**
  - Unspecified placement reporting cycle year for `cb2.pdf` overall stats (`Rs. 81 LPA` highest, `Rs. 7.25 LPA` Engg median, `5,000+` placed, `6,500+` offers — preserved with explicit caveat).
  - Unverified (`PENDING_VERIFICATION`): branch-wise sanctioned seat intake (`cb2.pdf`) and department-level semester syllabus PDFs (`pdfs/umd.pdf`).
- **`college_004` (`SAHE`, `5` pending + qualification note):**
  - **Overall average CTC & placement percentage** (not published on `placements/statistics/`; top-banner summary counters render `'0'` statically), admission document checklist (`scholarships/`), internship stipend amounts & mandatory B.Tech internship rules (`overview/` — split across 2 FAQs `[107]`, `[108]`), and itemized hostel & mess fees (`hostels/`). Also noted `B.Tech IT` is absent from `2026–27` fresh regular 4-year intake on `academic-programs/` while present in Lateral Entry `Fee-details.pdf`.
- **`college_005` (`PVPSIT`, `4` pending + historical-year note):**
  - Published fee schedule reflects **A.Y. `2024–25`** Mandatory Disclosure (`Compliance-MandatoryDisclosures-PVPSIT_2024-25.pdf`), while fresh **`2026–27` Category-A / Category-B (Management/NRI quota)** schedules remain `PENDING_VERIFICATION` (`[131]`). Other pending items: admission reporting certificate checklist (`admission_procedure.html`), Skill Excellence/internship stipends (`department_tp.html`), and annual hostel/mess fee table (`hostel.html`). Note that `colleges.json` also marks detailed PVPSIT college bus timetables as unavailable on checked pages.

---

## 5. Verification & End-to-End Test Results (Post-Final Edit)

| Check | Command / Scope | Observed Result |
| :--- | :--- | :--- |
| **Dataset & Live URL Validation** | `validate_datasets.py` across all `150` FAQs & `70` unique URLs | **Passed** (`0` structure errors, `0` duplicates, `0` `PENDING_VERIFICATION` inside verified answers, `0` cross-college leakage, **`70 / 70` HTTP 200**) |
| **Backend Test Suite** | `python -m pytest -v AI-Student-Chatbot/backend/tests` | **Passed** (`38 passed, 72 warnings in 2.23s`, `0` skipped/failed) |
| **Frontend Test Suite** | `vitest run --run` (`apiAndUtils.test.ts` + `App.test.tsx`) | **Passed** (`Test Files 2 passed (2)`, `Tests 7 passed (7)` in `112.13s`) |
| **TypeScript & Production Build** | `npx tsc -b` & `npm run build` (`tsc -b && vite build`) | **Passed** (`0` TS errors; `1025` modules transformed, built in `51.96s`) |
| **Live Full-Stack Server Probe** | `uvicorn` (`127.0.0.1:8011`) + `vite preview` (`127.0.0.1:4174`) across all 5 colleges | **Passed** (`FRONTEND OK: 200`, `COLLEGES COUNT: 5` returning exact `15/15`, `23/7`, `28/2`, `25/5`, `26/4` counts, and live `/api/chat` responses for `college_001`–`college_005`) |

