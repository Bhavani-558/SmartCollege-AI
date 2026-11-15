"""Core chatbot orchestration, college selection, and isolated FAQ retrieval service."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from backend.app.services.data_store import (
    EmptyQuestionError,
    FAQDataStoreProtocol,
    IntentDataError,
    MissingCollegeError,
)
from backend.app.services.intent_classifier import (
    DEFAULT_CONFIDENCE_THRESHOLD,
    predict_intent,
)
from backend.app.utils.schemas import (
    AdminCollegeCreateRequest,
    AdminCollegeDeleteResponse,
    AdminCollegeUpdateRequest,
    AdminFAQCreateRequest,
    AdminFAQDeleteResponse,
    AdminFAQListResponse,
    AdminFAQUpdateRequest,
    AdminFAQVerificationUpdateRequest,
    AdminFeedbackListResponse,
    AdminFeedbackStatsResponse,
    AdminFeedbackUpdateRequest,
    AdminOverviewStats,
    CandidateIntent,
    ChatResponse,
    CollegeDetailResponse,
    CollegeFAQListResponse,
    CollegeListResponse,
    CollegeSelectResponse,
    CollegeSummary,
    FAQItem,
    FeedbackRecord,
    FeedbackSubmitRequest,
    FeedbackSubmitResponse,
    HealthResponse,
)


class ChatbotService:
    """Orchestrates intent prediction, college scoping, and verified FAQ responses."""

    def __init__(
        self,
        data_store: FAQDataStoreProtocol,
        models_dir: Path | str,
        confidence_threshold: float | None = None,
        app_name: str = "AI-Powered Multi-College Student Chatbot API",
        app_version: str = "1.0.0",
        active_faq_backend: str = "json",
        postgres_configured: bool = False,
    ) -> None:
        self.data_store = data_store
        self.models_dir = Path(models_dir)
        self.confidence_threshold = (
            DEFAULT_CONFIDENCE_THRESHOLD
            if confidence_threshold is None
            else float(confidence_threshold)
        )
        self.app_name = app_name
        self.app_version = app_version
        self.active_faq_backend = active_faq_backend
        self.postgres_configured = postgres_configured

    @staticmethod
    def _normalize_optional_id(college_id: str | None) -> str | None:
        if college_id is None:
            return None
        stripped = college_id.strip()
        return stripped if stripped else None

    def list_colleges(self) -> CollegeListResponse:
        """Return all registered colleges with verified/pending FAQ counts."""
        summaries = [CollegeSummary(**item) for item in self.data_store.list_colleges()]
        return CollegeListResponse(
            total_colleges=len(summaries),
            colleges=summaries,
        )

    def get_college_detail(self, college_id: str) -> CollegeDetailResponse:
        """Return full institutional profile for one validated college_id."""
        normalized_id = college_id.strip()
        profile = self.data_store.get_college_profile(normalized_id)
        return CollegeDetailResponse(**profile)

    def select_college(
        self,
        college_id: str,
        previous_college_id: str | None = None,
    ) -> CollegeSelectResponse:
        """Select or switch the active college while resetting prior college context."""
        normalized_id = college_id.strip()
        normalized_prev = self._normalize_optional_id(previous_college_id)

        summary = CollegeSummary(**self.data_store.get_college_summary(normalized_id))
        profile = self.data_store.get_college_profile(normalized_id)

        if normalized_prev and normalized_prev != normalized_id:
            message = (
                f"Switched active college from '{normalized_prev}' to "
                f"'{summary.college_name}' ({summary.college_id}). Previous college context cleared."
            )
        else:
            message = (
                f"Active college set to '{summary.college_name}' ({summary.college_id}). "
                f"Verified FAQ records available: {summary.verified_faq_count}; "
                f"pending verification records: {summary.pending_faq_count}."
            )

        return CollegeSelectResponse(
            selected_college=summary,
            previous_college_id=normalized_prev,
            context_reset=True,
            supported_categories=list(profile.get("supported_categories", [])),
            message=message,
        )

    def get_college_faqs(
        self,
        college_id: str,
        category: str | None = None,
        verification_status: str | None = None,
    ) -> CollegeFAQListResponse:
        """Return FAQ records strictly isolated to the specified college_id."""
        normalized_id = college_id.strip()
        summary = self.data_store.get_college_summary(normalized_id)
        normalized_category = category.strip() if category and category.strip() else None
        normalized_status = (
            verification_status.strip()
            if verification_status and verification_status.strip()
            else None
        )

        records = self.data_store.get_college_faqs(
            college_id=normalized_id,
            category=normalized_category,
            verification_status=normalized_status,
        )
        faqs = [FAQItem(**item) for item in records]
        verified_count = sum(1 for item in faqs if item.verification_status == "VERIFIED")
        pending_count = sum(
            1 for item in faqs if item.verification_status == "PENDING_VERIFICATION"
        )

        return CollegeFAQListResponse(
            college_id=summary["college_id"],
            college_name=summary["college_name"],
            total_records=len(faqs),
            verified_count=verified_count,
            pending_count=pending_count,
            faqs=faqs,
        )

    def process_query(
        self,
        question: str,
        college_id: str | None = None,
        confidence_threshold: float | None = None,
    ) -> ChatResponse:
        """Predict student intent and return either general, verified, pending, or unknown response."""
        cleaned_question = question.strip() if isinstance(question, str) else ""
        if not cleaned_question:
            raise EmptyQuestionError()

        normalized_college_id = self._normalize_optional_id(college_id)
        college_summary: dict[str, Any] | None = None
        if normalized_college_id is not None:
            # Reject invalid college_ids immediately to prevent cross-college or silent fallbacks.
            college_summary = self.data_store.get_college_summary(normalized_college_id)

        effective_threshold = (
            self.confidence_threshold
            if confidence_threshold is None
            else float(confidence_threshold)
        )
        prediction = predict_intent(
            cleaned_question,
            threshold=effective_threshold,
            models_dir=self.models_dir,
        )
        top_candidates = [
            CandidateIntent(**candidate) for candidate in prediction.get("top_candidates", [])
        ]

        if prediction["is_unknown"]:
            return self._build_unknown_response(
                question=cleaned_question,
                prediction=prediction,
                top_candidates=top_candidates,
                college_summary=college_summary,
            )

        predicted_intent = str(prediction["intent"])
        intent_meta = self.data_store.get_intent_metadata(predicted_intent)
        if intent_meta is None:
            raise IntentDataError(
                f"Predicted intent '{predicted_intent}' was not found in student_intents.json."
            )

        if not intent_meta.college_specific:
            return self._build_general_response(
                question=cleaned_question,
                intent_name=predicted_intent,
                prediction=prediction,
                top_candidates=top_candidates,
                responses=intent_meta.responses,
                college_summary=college_summary,
            )

        if normalized_college_id is None or college_summary is None:
            raise MissingCollegeError(predicted_intent=predicted_intent)

        best_verified, other_verified, pending_records = self.data_store.lookup_category_faqs(
            college_id=normalized_college_id,
            category=intent_meta.category,
            question=cleaned_question,
        )

        if best_verified is not None:
            if best_verified["college_id"] != normalized_college_id:
                raise RuntimeError(
                    f"Cross-college isolation breach prevented: expected {normalized_college_id}, "
                    f"got {best_verified['college_id']}."
                )

            related_items = [
                FAQItem(**item)
                for item in other_verified
                if item.get("college_id") == normalized_college_id
            ]
            return ChatResponse(
                question=cleaned_question,
                intent=predicted_intent,
                candidate_intent=prediction.get("candidate_intent"),
                confidence=float(prediction["confidence"]),
                is_unknown=False,
                college_specific=True,
                response_type="verified_faq",
                verification_status="VERIFIED",
                college_id=normalized_college_id,
                college_name=college_summary["college_name"],
                answer=best_verified["answer"],
                matched_question=best_verified["question"],
                source=best_verified["source"],
                last_verified=best_verified["last_verified"],
                related_verified_faqs=related_items,
                top_candidates=top_candidates,
            )

        return self._build_pending_response(
            question=cleaned_question,
            intent_name=predicted_intent,
            category=intent_meta.category,
            prediction=prediction,
            top_candidates=top_candidates,
            college_summary=college_summary,
            pending_records=pending_records,
        )

    @staticmethod
    def _build_general_response(
        question: str,
        intent_name: str,
        prediction: dict[str, Any],
        top_candidates: list[CandidateIntent],
        responses: tuple[str, ...],
        college_summary: dict[str, Any] | None,
    ) -> ChatResponse:
        answer = (
            responses[0]
            if responses
            else "Hello! Please select a college and ask your academic or campus question."
        )
        return ChatResponse(
            question=question,
            intent=intent_name,
            candidate_intent=prediction.get("candidate_intent"),
            confidence=float(prediction["confidence"]),
            is_unknown=False,
            college_specific=False,
            response_type="general",
            verification_status="GENERAL",
            college_id=college_summary["college_id"] if college_summary else None,
            college_name=college_summary["college_name"] if college_summary else None,
            answer=answer,
            matched_question=None,
            source="student_intents",
            last_verified=None,
            related_verified_faqs=[],
            top_candidates=top_candidates,
        )

    @staticmethod
    def _build_pending_response(
        question: str,
        intent_name: str,
        category: str,
        prediction: dict[str, Any],
        top_candidates: list[CandidateIntent],
        college_summary: dict[str, Any],
        pending_records: list[dict[str, Any]],
    ) -> ChatResponse:
        college_id = college_summary["college_id"]
        college_name = college_summary["college_name"]
        matched_pending_question = pending_records[0]["question"] if pending_records else None
        pending_source = (
            pending_records[0]["source"] if pending_records else "PENDING_VERIFICATION"
        )

        notice = (
            f"PENDING_VERIFICATION: Verified information for '{category}' at "
            f"{college_name} ({college_id}) is not yet available. To avoid sharing unverified "
            f"details, please check directly with the official college administration or "
            f"admissions office."
        )
        return ChatResponse(
            question=question,
            intent=intent_name,
            candidate_intent=prediction.get("candidate_intent"),
            confidence=float(prediction["confidence"]),
            is_unknown=False,
            college_specific=True,
            response_type="pending_verification",
            verification_status="PENDING_VERIFICATION",
            college_id=college_id,
            college_name=college_name,
            answer=notice,
            matched_question=matched_pending_question,
            source=pending_source,
            last_verified="PENDING_VERIFICATION",
            related_verified_faqs=[],
            top_candidates=top_candidates,
        )

    @staticmethod
    def _build_unknown_response(
        question: str,
        prediction: dict[str, Any],
        top_candidates: list[CandidateIntent],
        college_summary: dict[str, Any] | None,
    ) -> ChatResponse:
        threshold = prediction.get("threshold", DEFAULT_CONFIDENCE_THRESHOLD)
        confidence = float(prediction["confidence"])
        answer = (
            f"I could not understand your question with sufficient confidence "
            f"(confidence={confidence:.2f}, required>={threshold:.2f}). "
            f"Please rephrase your student query around topics such as admissions, "
            f"courses, fees, scholarships, hostel, placements, campus location, or contact details."
        )
        return ChatResponse(
            question=question,
            intent="unknown",
            candidate_intent=prediction.get("candidate_intent"),
            confidence=confidence,
            is_unknown=True,
            college_specific=False,
            response_type="unknown",
            verification_status="NOT_APPLICABLE",
            college_id=college_summary["college_id"] if college_summary else None,
            college_name=college_summary["college_name"] if college_summary else None,
            answer=answer,
            matched_question=None,
            source=None,
            last_verified=None,
            related_verified_faqs=[],
            top_candidates=top_candidates,
        )

    def get_health_status(self) -> HealthResponse:
        """Return runtime readiness and configuration summary."""
        model_ready = (
            (self.models_dir / "intent_classifier.joblib").exists()
            and (self.models_dir / "tfidf_vectorizer.joblib").exists()
        )
        return HealthResponse(
            status="ok" if model_ready else "degraded",
            app_name=self.app_name,
            version=self.app_version,
            active_faq_backend=self.active_faq_backend,
            postgres_prepared=True,
            postgres_configured=self.postgres_configured,
            intent_classifier_loaded=model_ready,
            num_intents=self.data_store.count_intents(),
            confidence_threshold=self.confidence_threshold,
            total_colleges=len(self.data_store.list_colleges()),
        )

    def get_admin_stats(self) -> AdminOverviewStats:
        """Return aggregate statistics across colleges and FAQs."""
        raw_stats = self.data_store.get_overview_stats()
        summaries = [CollegeSummary(**item) for item in raw_stats["colleges"]]
        return AdminOverviewStats(
            total_colleges=raw_stats["total_colleges"],
            total_faqs=raw_stats["total_faqs"],
            verified_faqs=raw_stats["verified_faqs"],
            pending_faqs=raw_stats["pending_faqs"],
            total_queries=raw_stats.get("total_queries", 0),
            colleges=summaries,
        )

    def list_admin_faqs(
        self,
        college_id: str | None = None,
        category: str | None = None,
        verification_status: str | None = None,
        search: str | None = None,
    ) -> AdminFAQListResponse:
        """List FAQs with optional college, category, status filters and keyword search."""
        raw_records = self.data_store.list_admin_faqs(
            college_id=college_id,
            category=category,
            verification_status=verification_status,
            search=search,
        )
        faqs = [FAQItem(**item) for item in raw_records]
        verified_count = sum(1 for item in faqs if item.verification_status == "VERIFIED")
        pending_count = sum(1 for item in faqs if item.verification_status == "PENDING_VERIFICATION")
        return AdminFAQListResponse(
            total_records=len(faqs),
            verified_count=verified_count,
            pending_count=pending_count,
            faqs=faqs,
        )

    def get_admin_faq(self, faq_id: int | str) -> FAQItem:
        """Retrieve single FAQ by identifier."""
        record = self.data_store.get_faq_by_id(faq_id)
        return FAQItem(**record)

    def create_admin_faq(self, payload: AdminFAQCreateRequest) -> FAQItem:
        """Add a new FAQ for a registered college."""
        record = self.data_store.create_faq(
            college_id=payload.college_id,
            category=payload.category,
            question=payload.question,
            answer=payload.answer,
            source=payload.source,
            last_verified=payload.last_verified,
            verification_status=payload.verification_status,
        )
        return FAQItem(**record)

    def update_admin_faq(self, faq_id: int | str, payload: AdminFAQUpdateRequest) -> FAQItem:
        """Update an existing FAQ."""
        record = self.data_store.update_faq(
            faq_id=faq_id,
            college_id=payload.college_id,
            category=payload.category,
            question=payload.question,
            answer=payload.answer,
            source=payload.source,
            last_verified=payload.last_verified,
            verification_status=payload.verification_status,
        )
        return FAQItem(**record)

    def update_admin_faq_verification(
        self, faq_id: int | str, payload: AdminFAQVerificationUpdateRequest
    ) -> FAQItem:
        """Update FAQ verification status."""
        record = self.data_store.update_faq_verification(
            faq_id=faq_id,
            verification_status=payload.verification_status,
            last_verified=payload.last_verified,
        )
        return FAQItem(**record)

    def delete_admin_faq(self, faq_id: int | str) -> AdminFAQDeleteResponse:
        """Delete an existing FAQ."""
        result = self.data_store.delete_faq(faq_id)
        return AdminFAQDeleteResponse(**result)

    def create_admin_college(self, payload: AdminCollegeCreateRequest) -> CollegeDetailResponse:
        """Register a new college."""
        data = payload.model_dump()
        record = self.data_store.create_college(data)
        return CollegeDetailResponse(**record)

    def update_admin_college(
        self, college_id: str, payload: AdminCollegeUpdateRequest
    ) -> CollegeDetailResponse:
        """Update an existing college profile."""
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        record = self.data_store.update_college(college_id, updates)
        return CollegeDetailResponse(**record)

    def delete_admin_college(self, college_id: str) -> AdminCollegeDeleteResponse:
        """Delete a college safely if zero FAQs exist."""
        result = self.data_store.delete_college(college_id)
        return AdminCollegeDeleteResponse(**result)

    def submit_feedback(self, payload: FeedbackSubmitRequest) -> FeedbackSubmitResponse:
        """Process student feedback on a chatbot answer with duplicate prevention and updates."""
        record, is_updated = self.data_store.save_feedback(payload.model_dump())
        msg = "Feedback updated successfully." if is_updated else "Thank you for your feedback!"
        return FeedbackSubmitResponse(
            success=True,
            message=msg,
            feedback=FeedbackRecord(**record),
            is_updated=is_updated,
        )

    def list_admin_feedback(
        self,
        college_id: str | None = None,
        rating: str | None = None,
        status: str | None = None,
        reason: str | None = None,
        search: str | None = None,
        page: int = 1,
        limit: int = 10,
    ) -> AdminFeedbackListResponse:
        """List feedback records with multi-criteria filtering, search, and pagination."""
        safe_limit = max(1, min(limit, 100))
        safe_page = max(1, page)
        records, total = self.data_store.list_feedback(
            college_id=college_id,
            rating=rating,
            status=status,
            reason=reason,
            search=search,
            page=safe_page,
            limit=safe_limit,
        )
        total_pages = max(1, (total + safe_limit - 1) // safe_limit) if total > 0 else 1
        return AdminFeedbackListResponse(
            total_records=total,
            page=safe_page,
            limit=safe_limit,
            total_pages=total_pages,
            feedback=[FeedbackRecord(**r) for r in records],
        )

    def get_admin_feedback_stats(
        self, college_id: str | None = None
    ) -> AdminFeedbackStatsResponse:
        """Retrieve feedback summary statistics."""
        stats = self.data_store.get_feedback_stats(college_id=college_id)
        return AdminFeedbackStatsResponse(**stats)

    def update_admin_feedback(
        self, feedback_id: str, payload: AdminFeedbackUpdateRequest
    ) -> FeedbackRecord:
        """Update feedback review status or internal notes."""
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        record = self.data_store.update_feedback(feedback_id, updates)
        return FeedbackRecord(**record)


