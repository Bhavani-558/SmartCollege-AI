# SmartCollege AI — API Reference Documentation

**Base URL:** `http://127.0.0.1:8000`  
**Interactive Docs:** `http://127.0.0.1:8000/docs` (OpenAPI / Swagger UI)  
**Specification Format:** OpenAPI 3.0 / JSON Schemas  

---

## 1. Authentication & Security Model

SmartCollege AI employs a hybrid access model:
- **Student Endpoints:** Public and unauthenticated. Strictly enforced by input validation and college scoping rules.
- **Administrative Endpoints:** Protected by HTTP Bearer authentication using signed JSON Web Tokens (JWT).
  - Header format: `Authorization: Bearer <access_token>`
  - Algorithm: HMAC-SHA256 (`HS256`)
  - Expiration: Configurable (default: 480 minutes / 8 hours)
  - Revocation: Stateful persistent token registry (`revoked_tokens.json`) ensures logged-out or invalidated tokens are rejected immediately.

---

## 2. Standard Error Response Schema

All domain errors and HTTP exception responses follow a standardized JSON envelope:
```json
{
  "detail": "Human-readable explanation of the error",
  "error_code": "MACHINE_READABLE_CODE",
  "context": {
    "field": "optional contextual metadata"
  }
}
```

### Common Error Codes
| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `EMPTY_QUESTION` | Query string was empty or contained only whitespace. |
| `400 Bad Request` | `MISSING_COLLEGE_ID` | An institutional query was asked without providing an active `college_id`. |
| `401 Unauthorized` | `INVALID_CREDENTIALS` | Invalid username or password provided on admin sign-in. |
| `401 Unauthorized` | `INVALID_AUTH_HEADER` | Missing or improperly formatted Bearer token. |
| `401 Unauthorized` | `TOKEN_EXPIRED` | The JWT signature is valid but expired. |
| `401 Unauthorized` | `TOKEN_REVOKED` | The token was explicitly invalidated via admin logout. |
| `404 Not Found` | `COLLEGE_NOT_FOUND` | The specified `college_id` does not exist in registered colleges. |
| `404 Not Found` | `FAQ_NOT_FOUND` | The requested `faq_id` does not exist in the FAQ data store. |
| `409 Conflict` | `DUPLICATE_FAQ_QUESTION` | An FAQ with the identical question already exists for the specified college. |
| `409 Conflict` | `COLLEGE_HAS_FAQS` | Cannot delete a college while it still has active associated FAQs. |

---

## 3. Public Student Chatbot Endpoints

### 3.1 System Health
- **Endpoint:** `GET /health`
- **Description:** Returns runtime service metadata, active backend type, intent threshold, and summary counts.
- **Response (200 OK):**
  ```json
  {
    "status": "healthy",
    "app_name": "AI-Powered Multi-College Student Chatbot API",
    "version": "1.0.0",
    "active_faq_backend": "json",
    "postgres_configured": false,
    "confidence_threshold": 0.25,
    "total_colleges": 5,
    "total_faqs": 150,
    "verified_faqs": 126,
    "pending_faqs": 24
  }
  ```

### 3.2 List Colleges
- **Endpoint:** `GET /api/colleges`
- **Description:** Returns summary profiles of all registered institutions.
- **Response (200 OK):**
  ```json
  {
    "total_colleges": 5,
    "colleges": [
      {
        "college_id": "college_001",
        "college_name": "NRI University",
        "official_name": "Dr. RVR NRI Institute of Technology",
        "short_code": "NRIU",
        "location": "Agiripalli, Vijayawada Rural, Andhra Pradesh",
        "logo_url": "/logos/college_001.png",
        "is_primary_profile": true,
        "profile_status": "PARTIALLY_VERIFIED",
        "verified_faq_count": 21,
        "pending_faq_count": 9,
        "last_verified": "2026-11-11"
      }
    ]
  }
  ```

### 3.3 Get College Detail
- **Endpoint:** `GET /api/colleges/{college_id}`
- **Description:** Returns full institutional metadata for a specific college.
- **Response (200 OK):** Returns `CollegeDetailResponse` including official source URLs and supported categories.

### 3.4 Select or Switch College
- **Endpoint:** `POST /api/colleges/select`
- **Request Body:**
  ```json
  {
    "college_id": "college_002",
    "previous_college_id": "college_001"
  }
  ```
- **Response (200 OK):** Confirms college switch, returns `context_reset: true`, and provides supported categories.

### 3.5 College-Scoped FAQ Listing
- **Endpoint:** `GET /api/colleges/{college_id}/faqs`
- **Description:** Retrieves all curated FAQs belonging strictly to the selected college.

### 3.6 Student Chat Query
- **Endpoint:** `POST /api/chat`
- **Description:** Predicts student intent using TF-IDF + Logistic Regression and retrieves college-scoped answers.
- **Request Body:**
  ```json
  {
    "question": "What are the hostel facilities like at SRM?",
    "college_id": "college_002",
    "confidence_threshold": 0.25
  }
  ```
- **Response (200 OK - Verified Answer):**
  ```json
  {
    "question": "What are the hostel facilities like at SRM?",
    "intent": "hostel",
    "candidate_intent": "hostel",
    "confidence": 0.9982,
    "is_unknown": false,
    "college_specific": true,
    "response_type": "verified_faq",
    "verification_status": "VERIFIED",
    "college_id": "college_002",
    "college_name": "SRM University-AP",
    "answer": "SRM University-AP provides fully air-conditioned, separate multi-story hostel accommodation...",
    "matched_question": "What are the hostel facilities like at SRM University-AP?",
    "source": "https://srmap.edu.in/campus-life/hostels/",
    "last_verified": "2026-11-12",
    "related_verified_faqs": [],
    "top_candidates": [
      { "intent": "hostel", "confidence": 0.9982 }
    ]
  }
  ```

### 3.4 Submit Student Feedback
- **Endpoint:** `POST /api/feedback`
- **Description:** Submit thumbs up / thumbs down rating, optional reason category, and comments for an assistant answer. Automatically prevents duplicates within the same session + message while allowing students to update their rating.
- **Request Body:**
  ```json
  {
    "session_id": "session-12345",
    "message_id": "msg-8821",
    "college_id": "college_001",
    "college_name": "NRI University",
    "question": "What is the B.Tech CSE fee at NRI University?",
    "answer": "The B.Tech CSE tuition fee is INR 75,000 per academic year.",
    "intent": "fees",
    "rating": "thumbs_down",
    "reason": "Outdated information",
    "comment": "Hostel fee is not listed."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Feedback recorded successfully.",
    "feedback": {
      "feedback_id": "fb-8f92b7c4a1e3",
      "session_id": "session-12345",
      "message_id": "msg-8821",
      "college_id": "college_001",
      "college_name": "NRI University",
      "question": "What is the B.Tech CSE fee at NRI University?",
      "answer": "The B.Tech CSE tuition fee is INR 75,000 per academic year.",
      "intent": "fees",
      "rating": "thumbs_down",
      "reason": "Outdated information",
      "comment": "Hostel fee is not listed.",
      "created_at": "2026-11-13T10:05:00.000000+00:00",
      "updated_at": "2026-11-13T10:05:00.000000+00:00",
      "status": "NEW",
      "admin_notes": null
    },
    "is_updated": false
  }
  ```

---

## 4. Admin Authentication Endpoints

### 4.1 Admin Login
- **Endpoint:** `POST /api/admin/auth/login`
- **Description:** Authenticates administrator and returns a signed JWT access token.
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "YourSecurePassword2026!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 28800,
    "username": "admin"
  }
  ```

### 4.2 Current Admin Identity
- **Endpoint:** `GET /api/admin/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "username": "admin",
    "role": "superadmin",
    "is_active": true
  }
  ```

### 4.3 Admin Logout
- **Endpoint:** `POST /api/admin/auth/logout`
- **Headers:** `Authorization: Bearer <token>`
- **Description:** Invalidates the token by registering its unique JTI in the persistent revocation store.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Administrator session successfully logged out."
  }
  ```

---

## 5. Protected Administrative Management Endpoints

*All endpoints in this section require the `Authorization: Bearer <token>` header.*

### 5.1 Dashboard Overview Metrics
- **Endpoint:** `GET /api/admin/overview`
- **Response (200 OK):**
  ```json
  {
    "total_colleges": 5,
    "total_faqs": 150,
    "verified_faqs": 126,
    "pending_faqs": 24,
    "total_queries": 0,
    "colleges": [ ... ]
  }
  ```

### 5.2 List FAQs (with Search & Filters)
- **Endpoint:** `GET /api/admin/faqs`
- **Query Parameters:**
  - `college_id`: (Optional) Filter by specific college.
  - `verification_status`: (Optional) `VERIFIED` or `PENDING_VERIFICATION`.
  - `search`: (Optional) Keyword query matching questions, answers, and sources.
- **Response (200 OK):** Returns `AdminFAQListResponse` with counts and FAQ items.

### 5.3 Create New FAQ
- **Endpoint:** `POST /api/admin/faqs`
- **Request Body:**
  ```json
  {
    "college_id": "college_001",
    "category": "facilities",
    "question": "What sports facilities are provided on campus?",
    "answer": "NRI University provides basketball, cricket, badminton, and gym facilities.",
    "source": "https://rvrnriuniversity.edu.in/campus-life/",
    "last_verified": "2026-11-13",
    "verification_status": "VERIFIED"
  }
  ```
- **Response (201 Created):** Returns the created `FAQItem`.

### 5.4 Update FAQ
- **Endpoint:** `PUT /api/admin/faqs/{faq_id}`
- **Request Body:** Partial or complete updates to `question`, `answer`, `source`, `category`, `verification_status`.
- **Response (200 OK):** Returns the updated `FAQItem`.

### 5.5 Update Verification Status
- **Endpoint:** `PATCH /api/admin/faqs/{faq_id}/verification`
- **Request Body:**
  ```json
  {
    "verification_status": "VERIFIED",
    "last_verified": "2026-11-13"
  }
  ```
- **Response (200 OK):** Returns the updated `FAQItem`.

### 5.6 Delete FAQ
- **Endpoint:** `DELETE /api/admin/faqs/{faq_id}`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "FAQ '151' deleted successfully.",
    "deleted_faq_id": "151"
  }
  ```

### 5.7 College Management Endpoints
- `GET /api/admin/colleges`: List all college profiles.
- `POST /api/admin/colleges`: Register a new college profile.
- `PUT /api/admin/colleges/{college_id}`: Update college profile fields.
- `DELETE /api/admin/colleges/{college_id}`: Safely remove a college (enforces relational constraint preventing deletion if FAQs exist).

### 5.8 Admin Student Feedback Management Endpoints
- `GET /api/admin/feedback/stats`: Retrieve feedback counts (total, positive, negative, positive satisfaction percentage, breakdowns by college, reason, status).
- `GET /api/admin/feedback`: Filterable, searchable, and paginated feedback records.
  - Query parameters: `college_id`, `rating`, `status`, `reason`, `search`, `page`, `limit`.
- `PATCH /api/admin/feedback/{feedback_id}`: Update review status (`NEW`, `REVIEWED`, `RESOLVED`, `DISMISSED`) and attach internal administrative notes.
  - Request body: `{ "status": "RESOLVED", "admin_notes": "Audited with dean office." }`

