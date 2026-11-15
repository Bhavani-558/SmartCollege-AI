# Five-College Data Collection & Multi-College Integration Report

**Project:** AI-Powered Multi-College Chatbot for Student Queries  
**Dataset Schema Version:** `1.2` (`colleges.json`, `college_faq.json`)  
**Total Registered Institutions:** `5` (`college_001` through `college_005`)  
**Total FAQ Records:** `150` (`30` isolated records per college; `117 VERIFIED`, `33 PENDING_VERIFICATION`)

---

## 1. Registered College Mapping & Verification Summary

| `college_id` | Display Name | Short Code | Campus Location | `VERIFIED` | `PENDING_VERIFICATION` | Total FAQs | Local Logo Asset |
| :--- | :--- | :--- | :--- | ---: | ---: | ---: | :--- |
| `college_001` | NRI University (`Dr. RVR NRI Institute of Technology`) | `NRIU` | Agiripalli, Vijayawada Rural, Andhra Pradesh | 15 | 15 | 30 | `/logos/college_001.png` (`613x407`) |
| `college_002` | SRM University-AP | `SRMAP` | Neerukonda, Mangalagiri, Andhra Pradesh | 23 | 7 | 30 | `/logos/college_002.png` (`150x150`) |
| `college_003` | KL Deemed to be University | `KLU` | Vaddeswaram, Guntur District, Andhra Pradesh | 28 | 2 | 30 | `/logos/college_003.png` (`209x63`) |
| `college_004` | Siddhartha Academy of Higher Education *(formerly VRSEC)* | `SAHE` | Kanuru, Vijayawada, Andhra Pradesh | 25 | 5 | 30 | `/logos/college_004.jpg` (`150x150`) |
| `college_005` | Prasad V Potluri Siddhartha Institute of Technology | `PVPSIT` | Kanuru, Vijayawada, Andhra Pradesh | 26 | 4 | 30 | `/logos/college_005.png` (`193x193`) |
| **Total** | **5 Institutions** | — | **Andhra Pradesh** | **117** | **33** | **150** | **5 Local Assets** |

---

## 2. Institution-by-Institution Official Sources & Pending Scope

### 2.1 `college_001` — NRI University (`NRIU`)
- **Official Sources:** `https://nriuniversity.in/`, `https://rvrnriuniversity.edu.in/admissions/`, `https://rvrnriuniversity.edu.in/contact-us/` (`last_verified: 2026-11-11`).
- **Preservation Guarantee:** All 28 previously verified and pending FAQ records from the original collection were preserved, with 2 additional pending categories appended to maintain `30` records total (`15 VERIFIED`, `15 PENDING_VERIFICATION`).
- **`PENDING_VERIFICATION` Categories:** `admission_documents`, `anti_ragging`, `department_hod`, `examinations`, `facilities`, `fees`, `hostel`, `internships`, `library`, `mess_and_bus_timetable`, `placements`, `principal_info`, `scholarships`, `seat_intake`, `sports`.

### 2.2 `college_002` — SRM University-AP (`SRMAP`)
- **Official Sources:** `https://www.srmap.edu.in/`, `https://www.srmap.edu.in/admission/`, `https://www.srmap.edu.in/admission/seas-btech-tuition-fee/`, `https://www.srmap.edu.in/admission/seas-btech-eligibility/`, `https://www.srmap.edu.in/admission/seas-mtech-programme/`, `https://www.srmap.edu.in/admission/psb-bba-tuition-fee/`, `https://www.srmap.edu.in/admission/psb-mba-programme/`, `https://www.srmap.edu.in/admission/financial-aid/`, `https://www.srmap.edu.in/admission/seas-transportation-fee/`, `https://www.srmap.edu.in/crcs/crcs-placement-tracker/`, `https://www.srmap.edu.in/international-relations/internships/`, `https://www.srmap.edu.in/life-at-srmap/accommodation/`, `https://www.srmap.edu.in/life-at-srmap/library/`, `https://www.srmap.edu.in/life-at-srmap/sports/`, `https://www.srmap.edu.in/life-at-srmap/transportation/`, `https://www.srmap.edu.in/about-us/contact-us/`, `https://www.srmap.edu.in/anti-ragging-committee/`, `https://www.srmap.edu.in/wp-content/uploads/2025/05/SRM-UNIVERSITY-AP-transport.pdf` (`last_verified: 2026-11-12`).
- **Verified Coverage (23 FAQs):** Neerukonda campus location, SEAS/PSB/SLABS degree programs, visible SEAS B.Tech tuition schedule (undated heading; CSE Core/AI&ML Rs. 4,50,000/yr, Cyber/Big Data/Cloud Rs. 4,00,000/yr, CSE AI&FT/Product Engg with AI Rs. 4,75,000/yr, ECE Rs. 3,00,000/yr, ME/EEE/Civil Rs. 2,50,000/yr) & PSB BBA tuition fees, Academic Excellence Scholarship slabs for PSB BBA, CRCS placement tracker & PSB MBA placement highlights (`psb-mba-programme/`), internship stipends, Men's/Women's/International hostel capacity, C.V. Raman Block library holdings, Vijayawada/Guntur/Tadepalli/Tenali/Raintree Park transport (`seas-transportation-fee/`), and Anti-Ragging helplines.
- **Strictly Marked `PENDING_VERIFICATION` (7 FAQs):** `admission_documents`, `examinations`, unpublished domestic SEAS `hostel` breakdown in checked accommodation overview, current domestic SEAS B.Tech `scholarships` tier table, `seat_intake`, `syllabus`, and unpublished M.Tech/MBA domestic `fees` breakdown on checked programme pages.

### 2.3 `college_003` — KL Deemed to be University (`KLU`)
- **Official Sources:** `https://www.kluniversity.in/`, `https://www.kluniversity.in/accr.aspx`, `https://www.kluniversity.in/contact.aspx`, `https://www.kluniversity.in/howto1.aspx`, `https://www.kluniversity.in/programmes.aspx`, `https://www.kluniversity.in/PGProgrames.aspx`, `https://www.kluniversity.in/sships3.aspx`, `https://www.kluniversity.in/hfee.aspx`, `https://www.kluniversity.in/placem.aspx`, `https://www.kluniversity.in/lib/default.aspx`, `https://www.kluniversity.in/sports/default.aspx`, `https://www.kluniversity.in/transp.aspx`, `https://www.kluniversity.in/hostels/default.aspx`, `https://www.kluniversity.in/ips/default.aspx`, `https://www.kluniversity.in/pdfs/cb2.pdf`, `https://www.kluniversity.in/pdfs/dis.pdf`, `https://www.kluniversity.in/pdfs/umd.pdf`, `https://www.kluniversity.in/pdfs/antiragging.pdf` (`last_verified: 2026-11-12`).
- **Verified Coverage (28 FAQs):** Vaddeswaram campus & Governorpet administrative office, leadership (Vice Chancellor Dr. G. P. S. Varma & Registrar Prof. Indu Pavan Kumar Konduru), UG/PG/Ph.D. programs, 2026–27 KLEEE/JEE/Merit scholarship slabs, 2026–27 hostel fee tables, placements (`cb2.pdf`, placement cycle year unspecified in booklet) & `2024–25` internships, transport fleet (`transp.aspx`), library, sports, and anti-ragging compliance.
- **Strictly Marked `PENDING_VERIFICATION` (2 FAQs):** `seat_intake`, `syllabus`.

### 2.4 `college_004` — Siddhartha Academy of Higher Education (`SAHE`)
- **Official Sources:** `https://siddhartha.edu.in/`, `https://admissions.siddhartha.edu.in/`, `https://siddhartha.edu.in/overview/`, `https://siddhartha.edu.in/contact-us/`, `https://siddhartha.edu.in/academic-programs/`, `https://siddhartha.edu.in/academic-calendar/`, `https://siddhartha.edu.in/academic-regulations/`, `https://siddhartha.edu.in/schools/`, `https://siddhartha.edu.in/scholarships/`, `https://siddhartha.edu.in/placements/statistics/`, `https://siddhartha.edu.in/hostels/`, `https://siddhartha.edu.in/central-library/`, `https://siddhartha.edu.in/central-facilities/`, `https://siddhartha.edu.in/sports/`, `https://siddhartha.edu.in/deans/`, `https://siddhartha.edu.in/anti-ragging/`, `https://siddhartha.edu.in/wp-content/uploads/2026/01/Fee-details.pdf`, `https://siddhartha.edu.in/wp-content/uploads/2025/11/Proforma-of-Public-Self-Disclosure.pdf` (`last_verified: 2026-11-12`).
- **Verified Coverage (25 FAQs):** Kanuru Deemed-to-be-University campus (formerly VRSEC), `2026-27` UG/PG seat intakes, `Fee-details.pdf` fee structures, merit scholarships, `2025-26` company-wise placement offers (`1,920*` total offers, TCS `251`, Amazon `Rs. 48 LPA`, Myntra `Rs. 35.50 LPA`), hostels (725+ beds), library (78,514 volumes), 10-acre sports facilities, School Deans, Academic Calendars (`academic-calendar/`), and anti-ragging cells.
- **Strictly Marked `PENDING_VERIFICATION` (5 FAQs):** `admission_documents`, unpublished `hostel` fee charges, `internships`, and unpublished overall average CTC / dynamic placement counter.

### 2.5 `college_005` — Prasad V Potluri Siddhartha Institute of Technology (`PVPSIT`)
- **Official Sources:** `https://www.pvpsiddhartha.ac.in/`, `https://www.pvpsiddhartha.ac.in/contact_us_new.html`, `https://www.pvpsiddhartha.ac.in/admission_procedure.html`, `https://www.pvpsiddhartha.ac.in/programesoffered_n.html`, `https://www.pvpsiddhartha.ac.in/feestructure.html`, `https://www.pvpsiddhartha.ac.in/examination_section.html`, `https://www.pvpsiddhartha.ac.in/department_tp.html`, `https://www.pvpsiddhartha.ac.in/hostel.html`, `https://www.pvpsiddhartha.ac.in/library.html`, `https://www.pvpsiddhartha.ac.in/department_sport.html`, `https://www.pvpsiddhartha.ac.in/antiragging.html`, `https://www.pvpsiddhartha.ac.in/academicregulations_n.html`, `https://www.pvpsiddhartha.ac.in/mandatory/Compliance-MandatoryDisclosures-PVPSIT_2024-25.pdf` (`last_verified: 2026-11-12`).
- **Verified Coverage (26 FAQs):** Kanuru JNTUK-affiliated Autonomous campus, Principal Dr. K. Sivaji Babu & all 9 HODs, APSCHE CET-based admissions (70% Category-A / 30% Category-B), Mandatory Disclosure intakes (`780` B.Tech + `78` EWS) & `2024-25` historical fee norms, `2025-26` placements (`1,124` offers, Rs. `48 LPA` highest), `189` internship offers, Girls/Boys hostels, Central Library (`56,502` volumes), labs, sports, PVP23/20/24/25 academic regulations, and anti-ragging helplines.
- **Strictly Marked `PENDING_VERIFICATION` (4 FAQs):** `admission_documents`, fresh `2026-27` newly admitted Category-A/Category-B `fees` table, `hostel` fee table, and unpublished `internships` credit rules.
- **Strict Separation Guarantee (`college_004` vs `college_005`):** Even though both institutions are located in Kanuru, Vijayawada, every FAQ record, official URL, contact detail, leadership roster, and logo asset is strictly segregated by `college_id`. Automated backend and live Chrome E2E tests explicitly verify zero leakage between `SAHE` and `PVPSIT`.

---

## 3. Architecture & Code Integration Updates

- **NLP Classifier Preserved Untouched:** `backend/app/models/*` (`TfidfVectorizer` + `LogisticRegression`, `30` intents, threshold `0.25`) and `dataset/processed/student_intents.json` were not retrained or altered.
- **Datasets:** Updated [`colleges.json`](../dataset/processed/colleges.json), [`college_faq.json`](../dataset/processed/college_faq.json), and [`dataset_summary.json`](../dataset/processed/dataset_summary.json) with `location` and `logo_url` fields plus `150` strictly partitioned FAQ records (`150` unique `(college_id, question)` pairs).
- **Backend API & Persistence:** Extended [`schemas.py`](../backend/app/utils/schemas.py) (`CollegeSummary`, `CollegeDetailResponse`), [`data_store.py`](../backend/app/services/data_store.py), and [`postgres_repository.py`](../backend/app/services/postgres_repository.py) to expose optional `location` and `logo_url` fields while preserving backward compatibility.
- **Frontend UI & Assets:** Downloaded all 5 official logos locally under `frontend/public/logos/`, added optional `location` and `logo_url` types in [`api.ts`](../frontend/src/types/api.ts), built [`CollegeAvatar.tsx`](../frontend/src/components/CollegeAvatar.tsx) with an automatic `SchoolRoundedIcon` fallback, and integrated college logos and campus locations into [`LandingPage.tsx`](../frontend/src/pages/LandingPage.tsx), [`CollegeSelector.tsx`](../frontend/src/components/CollegeSelector.tsx), [`ChatWindow.tsx`](../frontend/src/components/ChatWindow.tsx), and [`Sidebar.tsx`](../frontend/src/components/Sidebar.tsx).

---

## 4. Verification Results

- **Backend Test Suite (`python -m pytest -v backend/tests`):** **`38 passed`**, `72 warnings` in `0.70s` (covering all 5 colleges' metadata, scoped FAQ counts, `PostgresDataStore` sync of `5` colleges / `150` FAQs, intent prediction, pending notices, invalid/missing `college_id` errors, and strict `SAHE` vs `PVPSIT` isolation).
- **Frontend Unit & Component Tests (`npm test`):** **`2 passed` test files / `7 passed` tests** (`apiAndUtils.test.ts` and `App.test.tsx`).
- **TypeScript Validation (`npx tsc -b`):** **`0` errors**.
- **Production Build (`npm run build`):** **`1025` modules transformed, built cleanly in `34.62s`** to `frontend/dist/`.
- **Live Browser End-to-End Verification (Headless Chrome CDP against `uvicorn` + `vite`):** Passed all **8 E2E stages** with **`0` runtime exceptions** and **`0` console errors** — verifying all 5 college cards and local logos loaded cleanly on `/`, general queries, verified answers + official source links and pending notices across `college_001` through `college_005`, zero cross-college leakage (`SAHE` <-> `PVPSIT`), `400 MISSING_COLLEGE_ID` handling, and responsive mobile layout (`390x844`, `scrollWidth <= innerWidth`).

