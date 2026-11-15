"""Pydantic request and response schemas for the Multi-College Chatbot API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Structured error response model."""

    detail: str
    error_code: str
    context: dict[str, Any] | None = None


class CollegeSummary(BaseModel):
    """Summary metadata for a registered college profile."""

    college_id: str
    college_name: str
    official_name: str | None = None
    short_code: str
    location: str | None = None
    logo_url: str | None = None
    is_primary_profile: bool = False
    profile_status: str
    verified_faq_count: int
    pending_faq_count: int
    last_verified: str


class CollegeListResponse(BaseModel):
    """Response schema for listing registered colleges."""

    total_colleges: int
    colleges: list[CollegeSummary]


class CollegeDetailResponse(BaseModel):
    """Full college profile schema strictly scoped to one college_id."""

    college_id: str
    college_name: str
    official_name: str | None = None
    short_code: str
    location: str | None = None
    logo_url: str | None = None
    ugc_status: str | None = None
    is_primary_profile: bool = False
    profile_status: str
    official_sources: list[str] = Field(default_factory=list)
    supported_categories: list[str] = Field(default_factory=list)
    verified_fields: dict[str, Any] = Field(default_factory=dict)
    institutional_data: dict[str, Any] = Field(default_factory=dict)
    last_verified: str


class CollegeSelectRequest(BaseModel):
    """Request payload for selecting or switching the active college."""

    college_id: str = Field(..., min_length=1, description="Target college identifier.")
    previous_college_id: str | None = Field(
        default=None,
        description="Optional previously active college identifier when switching colleges.",
    )


class CollegeSelectResponse(BaseModel):
    """Confirmation payload after selecting or switching a college."""

    selected_college: CollegeSummary
    previous_college_id: str | None = None
    context_reset: bool = True
    supported_categories: list[str]
    message: str


class FAQItem(BaseModel):
    """Single college-scoped FAQ item."""

    id: int | str | None = None
    college_id: str
    college_name: str
    category: str
    question: str
    answer: str
    source: str
    last_verified: str
    verification_status: Literal["VERIFIED", "PENDING_VERIFICATION"]


class CollegeFAQListResponse(BaseModel):
    """College-scoped FAQ listing response."""

    college_id: str
    college_name: str
    total_records: int
    verified_count: int
    pending_count: int
    faqs: list[FAQItem]


class ChatRequest(BaseModel):
    """Chatbot query request payload."""

    question: str = Field(..., description="Student question text.")
    college_id: str | None = Field(
        default=None,
        description="Selected college_id. Required for college-specific intents.",
    )
    confidence_threshold: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional confidence threshold override in [0.0, 1.0].",
    )


class CandidateIntent(BaseModel):
    """Candidate intent probability item."""

    intent: str
    confidence: float


class ChatResponse(BaseModel):
    """Chatbot response payload covering general, verified, pending, and unknown cases."""

    question: str
    intent: str
    candidate_intent: str | None = None
    confidence: float
    is_unknown: bool
    college_specific: bool
    response_type: Literal["general", "verified_faq", "pending_verification", "unknown"]
    verification_status: Literal["GENERAL", "VERIFIED", "PENDING_VERIFICATION", "NOT_APPLICABLE"]
    college_id: str | None = None
    college_name: str | None = None
    answer: str
    matched_question: str | None = None
    source: str | None = None
    last_verified: str | None = None
    related_verified_faqs: list[FAQItem] = Field(default_factory=list)
    top_candidates: list[CandidateIntent] = Field(default_factory=list)


class HealthResponse(BaseModel):
    """Service health and readiness status."""

    status: str
    app_name: str
    version: str
    active_faq_backend: str
    postgres_prepared: bool
    postgres_configured: bool
    intent_classifier_loaded: bool
    num_intents: int
    confidence_threshold: float
    total_colleges: int


class AdminLoginRequest(BaseModel):
    """Admin login credentials request."""

    username: str = Field(..., min_length=1, description="Admin username.")
    password: str = Field(..., min_length=1, description="Admin plain text password.")


class AdminLoginResponse(BaseModel):
    """Admin login response without JWT token in body."""

    token_type: str = "bearer"
    expires_in: int
    username: str


class AdminUserResponse(BaseModel):
    """Admin profile information response."""

    username: str
    role: str = "admin"
    authenticated: bool = True


class AdminLogoutResponse(BaseModel):
    """Admin logout confirmation response."""

    message: str
    success: bool = True


class AdminOverviewStats(BaseModel):
    """Aggregate metric statistics for Admin Dashboard."""

    total_colleges: int
    total_faqs: int
    verified_faqs: int
    pending_faqs: int
    total_queries: int
    colleges: list[CollegeSummary]


class AdminFAQCreateRequest(BaseModel):
    """Admin payload to create a new college FAQ."""

    college_id: str = Field(..., min_length=1, description="Registered college identifier.")
    category: str = Field(..., min_length=1, description="FAQ category.")
    question: str = Field(..., min_length=3, description="FAQ question text.")
    answer: str = Field(..., min_length=3, description="FAQ answer text.")
    source: str = Field(..., min_length=3, description="Official source citation URL.")
    last_verified: str | None = Field(default=None, description="Date string YYYY-MM-DD.")
    verification_status: Literal["VERIFIED", "PENDING_VERIFICATION"] = "PENDING_VERIFICATION"


class AdminFAQUpdateRequest(BaseModel):
    """Admin payload to update an existing FAQ."""

    college_id: str | None = Field(default=None, description="Updated college identifier.")
    category: str | None = Field(default=None, description="Updated FAQ category.")
    question: str | None = Field(default=None, min_length=3, description="Updated question text.")
    answer: str | None = Field(default=None, min_length=3, description="Updated answer text.")
    source: str | None = Field(default=None, min_length=3, description="Updated source citation URL.")
    last_verified: str | None = Field(default=None, description="Updated date string YYYY-MM-DD.")
    verification_status: Literal["VERIFIED", "PENDING_VERIFICATION"] | None = Field(
        default=None, description="Updated verification status."
    )


class AdminFAQVerificationUpdateRequest(BaseModel):
    """Admin payload to update only verification status."""

    verification_status: Literal["VERIFIED", "PENDING_VERIFICATION"]
    last_verified: str | None = None


class AdminFAQDeleteResponse(BaseModel):
    """Response confirming FAQ deletion."""

    success: bool = True
    message: str
    deleted_faq_id: int | str


class AdminFAQListResponse(BaseModel):
    """Admin response for listing FAQs with filtering and search."""

    total_records: int
    verified_count: int
    pending_count: int
    faqs: list[FAQItem]


class AdminCollegeCreateRequest(BaseModel):
    """Admin payload to register a new college."""

    college_id: str = Field(..., min_length=1, description="Unique college identifier (e.g., college_006).")
    college_name: str = Field(..., min_length=2, description="Display name of the college.")
    official_name: str | None = Field(default=None, description="Full official registered name.")
    short_code: str = Field(default="PENDING_VERIFICATION", description="Short abbreviation / code.")
    location: str | None = Field(default=None, description="Physical location or city, state.")
    logo_url: str | None = Field(default=None, description="URL or relative path to college logo.")
    ugc_status: str | None = Field(default=None, description="UGC recognition status.")
    is_primary_profile: bool = False
    profile_status: str = Field(default="PENDING_VERIFICATION", description="Profile verification status.")
    official_sources: list[str] = Field(default_factory=list, description="List of official source URLs.")
    supported_categories: list[str] = Field(default_factory=list, description="List of supported FAQ categories.")
    verified_fields: dict[str, Any] = Field(default_factory=dict, description="Verified institutional field values.")
    institutional_data: dict[str, Any] = Field(default_factory=dict, description="Extended institutional metadata.")
    last_verified: str = Field(default="PENDING_VERIFICATION", description="Date string or PENDING_VERIFICATION.")


class AdminCollegeUpdateRequest(BaseModel):
    """Admin payload to update college profile information."""

    college_name: str | None = Field(default=None, min_length=2, description="Updated college name.")
    official_name: str | None = Field(default=None, description="Updated official name.")
    short_code: str | None = Field(default=None, description="Updated short code.")
    location: str | None = Field(default=None, description="Updated location.")
    logo_url: str | None = Field(default=None, description="Updated logo URL.")
    ugc_status: str | None = Field(default=None, description="Updated UGC status.")
    is_primary_profile: bool | None = None
    profile_status: str | None = None
    official_sources: list[str] | None = None
    supported_categories: list[str] | None = None
    verified_fields: dict[str, Any] | None = None
    institutional_data: dict[str, Any] | None = None
    last_verified: str | None = None


class AdminCollegeDeleteResponse(BaseModel):
    """Response confirming college deletion."""

    success: bool = True
    message: str
    deleted_college_id: str


# ==========================================
# Phase 6: Student Feedback Schemas
# ==========================================


class FeedbackSubmitRequest(BaseModel):
    """Payload for submitting or updating feedback on a chatbot answer."""

    session_id: str = Field(..., min_length=1, description="Anonymous client session identifier.")
    message_id: str = Field(..., min_length=1, description="Unique identifier of the answered message.")
    college_id: str = Field(..., min_length=1, description="Associated college ID (or 'general').")
    college_name: str | None = Field(default=None, description="Display name of the college.")
    question: str = Field(..., min_length=1, description="Student's query text.")
    answer: str = Field(..., min_length=1, description="Chatbot's response text.")
    intent: str | None = Field(default=None, description="Predicted or detected intent.")
    rating: Literal["thumbs_up", "thumbs_down"] = Field(..., description="Binary student rating.")
    reason: Literal[
        "Incorrect answer",
        "Outdated information",
        "Irrelevant answer",
        "Incomplete answer",
        "Other",
    ] | None = Field(default=None, description="Categorized reason for negative rating.")
    comment: str | None = Field(default=None, max_length=1000, description="Optional student text comment.")


class FeedbackRecord(BaseModel):
    """Stored feedback entry model."""

    feedback_id: str
    session_id: str
    message_id: str
    college_id: str
    college_name: str
    question: str
    answer: str
    intent: str | None = None
    rating: Literal["thumbs_up", "thumbs_down"]
    reason: str | None = None
    comment: str | None = None
    created_at: str
    updated_at: str
    status: Literal["NEW", "REVIEWED", "RESOLVED", "DISMISSED"] = "NEW"
    admin_notes: str | None = None


class FeedbackSubmitResponse(BaseModel):
    """Response confirming feedback submission or update."""

    success: bool = True
    message: str
    feedback: FeedbackRecord
    is_updated: bool = False


class AdminFeedbackUpdateRequest(BaseModel):
    """Admin payload to update feedback review status or notes."""

    status: Literal["NEW", "REVIEWED", "RESOLVED", "DISMISSED"] | None = Field(
        default=None, description="Updated review lifecycle status."
    )
    admin_notes: str | None = Field(default=None, max_length=2000, description="Internal administrator notes.")


class AdminFeedbackStatsResponse(BaseModel):
    """Aggregate metrics for student answer feedback."""

    total_count: int
    positive_count: int
    negative_count: int
    positive_percentage: float
    by_college: dict[str, int]
    by_reason: dict[str, int]
    by_status: dict[str, int]


class AdminFeedbackListResponse(BaseModel):
    """Paginated feedback records for administrator review."""

    total_records: int
    page: int
    limit: int
    total_pages: int
    feedback: list[FeedbackRecord]


class FeedbackDeleteResponse(BaseModel):
    """Response confirming feedback record deletion."""

    success: bool = True
    message: str
    deleted_feedback_id: str





