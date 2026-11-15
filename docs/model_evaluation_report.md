# NLP Intent Classifier Model Evaluation Report

**Project:** AI-Powered Multi-College Chatbot for Student Queries  
**Dataset:** `dataset/processed/student_intents.json`  
**Model Architecture:** Scikit-learn `TfidfVectorizer` (`char_wb`, n-grams `3–5`, `sublinear_tf=True`) + `LogisticRegression` (`C=10.0`, `max_iter=1000`)  
**Saved Artifacts:** `backend/app/models/tfidf_vectorizer.joblib`, `backend/app/models/intent_classifier.joblib`, `backend/app/models/model_metadata.json`  
**Confidence Threshold:** `0.25` (predictions below threshold return `intent = "unknown"`)  
**Evaluated On:** 2026-11-12T16:41:05Z

> **Scope Note:** The intent classifier predicts student query intents independently of college FAQ availability. Categories such as `fees`, `scholarships`, `placements`, `internships`, and `hostel` remain preserved in the classifier while their college-specific answers stay `PENDING_VERIFICATION` until verified institutional sources are added. `dataset/raw/model.h5` was not used.

---

## 1. Dataset & Stratified Split Summary

| Metric | Value |
| --- | ---: |
| **Total Intents (Classes)** | 30 |
| **Total Cleaned Patterns** | 564 |
| **Training Split (80% Stratified)** | 451 |
| **Hold-Out Test Split (20% Stratified)** | 113 |
| **Random Seed** | 42 |

---

## 2. Overall Evaluation Metrics

### 2.1 Hold-Out Test Split Metrics (Unseen 20%, `n = 113`)

| Metric | Score |
| --- | ---: |
| **Accuracy** | **0.9735** (97.35%) |
| **Precision (Macro Avg)** | 0.9750 |
| **Precision (Weighted Avg)** | 0.9801 |
| **Recall (Macro Avg)** | 0.9600 |
| **Recall (Weighted Avg)** | 0.9735 |
| **F1-Score (Macro Avg)** | **0.9596** |
| **F1-Score (Weighted Avg)** | **0.9719** |

### 2.2 5-Fold Stratified Cross-Validation (`n = 564`)

| Metric | Mean | Std Dev |
| --- | ---: | ---: |
| **CV Accuracy** | 0.9308 | ± 0.0105 |
| **CV Precision (Macro)** | 0.9397 | ± 0.0168 |
| **CV Recall (Macro)** | 0.9082 | ± 0.0135 |
| **CV F1-Score (Macro)** | 0.9097 | ± 0.0091 |

---

## 3. Per-Class Classification Report (Hold-Out Test Split)

| Intent | Precision | Recall | F1-Score | Support |
| --- | ---: | ---: | ---: | ---: |
| `admission_documents` | 1.0000 | 1.0000 | 1.0000 | 3 |
| `admissions` | 1.0000 | 1.0000 | 1.0000 | 4 |
| `anti_ragging` | 1.0000 | 1.0000 | 1.0000 | 2 |
| `campus_events` | 1.0000 | 1.0000 | 1.0000 | 2 |
| `canteen` | 1.0000 | 1.0000 | 1.0000 | 4 |
| `college_hours` | 0.7500 | 1.0000 | 0.8571 | 3 |
| `college_location` | 1.0000 | 1.0000 | 1.0000 | 11 |
| `contact_info` | 1.0000 | 1.0000 | 1.0000 | 5 |
| `courses` | 1.0000 | 1.0000 | 1.0000 | 8 |
| `department_hod` | 1.0000 | 1.0000 | 1.0000 | 3 |
| `dress_code` | 1.0000 | 1.0000 | 1.0000 | 2 |
| `examinations` | 1.0000 | 1.0000 | 1.0000 | 2 |
| `facilities` | 0.8333 | 1.0000 | 0.9091 | 5 |
| `fees` | 1.0000 | 1.0000 | 1.0000 | 8 |
| `general_queries` | 1.0000 | 0.5000 | 0.6667 | 2 |
| `goodbye` | 0.6667 | 1.0000 | 0.8000 | 2 |
| `greeting` | 1.0000 | 0.5000 | 0.6667 | 2 |
| `holidays_and_vacations` | 1.0000 | 1.0000 | 1.0000 | 2 |
| `hostel` | 1.0000 | 1.0000 | 1.0000 | 7 |
| `internships` | 1.0000 | 1.0000 | 1.0000 | 4 |
| `library` | 1.0000 | 0.8000 | 0.8889 | 5 |
| `mess_and_bus_timetable` | 1.0000 | 1.0000 | 1.0000 | 2 |
| `placements` | 1.0000 | 1.0000 | 1.0000 | 5 |
| `principal_info` | 1.0000 | 1.0000 | 1.0000 | 1 |
| `salutation` | 1.0000 | 1.0000 | 1.0000 | 3 |
| `scholarships` | 1.0000 | 1.0000 | 1.0000 | 9 |
| `seat_intake` | 1.0000 | 1.0000 | 1.0000 | 2 |
| `sports` | 1.0000 | 1.0000 | 1.0000 | 2 |
| `student_committees` | 1.0000 | 1.0000 | 1.0000 | 1 |
| `syllabus` | 1.0000 | 1.0000 | 1.0000 | 2 |

---

## 4. Confusion Matrix & Error Analysis

Visual heatmap saved to `docs/confusion_matrix.png`.

### 4.1 Misclassified Hold-Out Test Samples (3 of 113)

| Test Pattern | True Intent | Predicted Intent | Confidence |
| --- | --- | --- | ---: |
| `good day` | `greeting` | `goodbye` | 0.4897 |
| `book facility` | `library` | `facilities` | 0.3714 |
| `why i should use you` | `general_queries` | `college_hours` | 0.2150 |

### 4.2 Full 30x30 Confusion Matrix (Hold-Out Test Split)

Class index legend: `C01`=admission_documents, `C02`=admissions, `C03`=anti_ragging, `C04`=campus_events, `C05`=canteen, `C06`=college_hours, `C07`=college_location, `C08`=contact_info, `C09`=courses, `C10`=department_hod, `C11`=dress_code, `C12`=examinations, `C13`=facilities, `C14`=fees, `C15`=general_queries, `C16`=goodbye, `C17`=greeting, `C18`=holidays_and_vacations, `C19`=hostel, `C20`=internships, `C21`=library, `C22`=mess_and_bus_timetable, `C23`=placements, `C24`=principal_info, `C25`=salutation, `C26`=scholarships, `C27`=seat_intake, `C28`=sports, `C29`=student_committees, `C30`=syllabus

| True \ Pred | C01 | C02 | C03 | C04 | C05 | C06 | C07 | C08 | C09 | C10 | C11 | C12 | C13 | C14 | C15 | C16 | C17 | C18 | C19 | C20 | C21 | C22 | C23 | C24 | C25 | C26 | C27 | C28 | C29 | C30 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `C01` (`admission_documents`) | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C02` (`admissions`) | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C03` (`anti_ragging`) | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C04` (`campus_events`) | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C05` (`canteen`) | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C06` (`college_hours`) | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C07` (`college_location`) | 0 | 0 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C08` (`contact_info`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C09` (`courses`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C10` (`department_hod`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C11` (`dress_code`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C12` (`examinations`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C13` (`facilities`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C14` (`fees`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C15` (`general_queries`) | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C16` (`goodbye`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C17` (`greeting`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C18` (`holidays_and_vacations`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C19` (`hostel`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C20` (`internships`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C21` (`library`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C22` (`mess_and_bus_timetable`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C23` (`placements`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C24` (`principal_info`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| `C25` (`salutation`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| `C26` (`scholarships`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 9 | 0 | 0 | 0 | 0 |
| `C27` (`seat_intake`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| `C28` (`sports`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| `C29` (`student_committees`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| `C30` (`syllabus`) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |

---

## 5. Confidence Threshold Verification (`predict_intent`)

Threshold configured at **`0.25`** in `backend/app/services/intent_classifier.py`.

| Input Query | Expected Behavior | Predicted `intent` | Raw Candidate | Confidence | `is_unknown` |
| --- | --- | --- | --- | ---: | --- |
| `What is the semester tuition fee?` | In-domain (`fees`) | `fees` | `fees` | 0.8696 | `False` |
| `Are scholarships available for BTech students?` | In-domain (`scholarships`) | `scholarships` | `scholarships` | 0.9606 | `False` |
| `Which companies visit for placements?` | In-domain (`placements`) | `placements` | `placements` | 0.9877 | `False` |
| `Does the college offer summer internships?` | In-domain (`internships`) | `internships` | `internships` | 0.8992 | `False` |
| `Do you have hostel facilities?` | In-domain (`hostel`) | `hostel` | `hostel` | 0.8883 | `False` |
| `How do I apply for admission?` | In-domain (`admissions`) | `admissions` | `admissions` | 0.9526 | `False` |
| `Where is the college located?` | In-domain (`college_location`) | `college_location` | `college_location` | 0.9852 | `False` |
| `Hello there` | In-domain (`greeting`) | `greeting` | `greeting` | 0.8489 | `False` |
| `What is the weather in Hyderabad today?` | Out-of-domain (`unknown`) | `unknown` | `canteen` | 0.1036 | `True` |
| `Tell me a funny joke about cats` | Out-of-domain (`unknown`) | `unknown` | `campus_events` | 0.0975 | `True` |
| `Who won the cricket world cup?` | Out-of-domain (`unknown`) | `unknown` | `salutation` | 0.1281 | `True` |
| `asdfghjkl qwerty` | Gibberish (`unknown`) | `unknown` | `courses` | 0.0722 | `True` |
| `` | Empty input (`unknown`) | `unknown` | `None` | 0.0000 | `True` |

---

## 6. Artifacts Produced

- `backend/app/models/tfidf_vectorizer.joblib` — Final fitted TF-IDF vectorizer
- `backend/app/models/intent_classifier.joblib` — Final fitted Logistic Regression classifier
- `backend/app/models/model_metadata.json` — Model configuration, labels, threshold, and evaluation metrics
- `backend/app/services/intent_classifier.py` — Reusable `IntentClassifier` and `predict_intent()` service
- `backend/app/utils/train_intent_classifier.py` — Reproducible training and evaluation script
- `docs/confusion_matrix.png` — Confusion matrix visualization
- `docs/model_evaluation_report.md` — This evaluation report
