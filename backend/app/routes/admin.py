"""Protected administrator API routes for dashboard stats, FAQ CRUD, and college management."""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from backend.app.services.chatbot_service import ChatbotService
from backend.app.utils.admin_auth import get_current_admin, csrf_protect
from backend.app.utils.dependencies import get_chatbot_service
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
    AdminUserResponse,
    CollegeDetailResponse,
    CollegeListResponse,
    ErrorResponse,
    FAQItem,
    FeedbackRecord,
)

logger = logging.getLogger("admin_audit")
router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard"])


# ============================================================================
# 1. Dashboard Overview Statistics
# ============================================================================

@router.get(
    "/stats",
    response_model=AdminOverviewStats,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required."},
    },
    summary="Dashboard Overview Statistics",
    description="Returns aggregate statistics including total registered colleges, total FAQs, verified count, and pending verification count.",
)
def get_dashboard_stats(
    _admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> AdminOverviewStats:
    """Retrieve aggregate statistics for the Admin Dashboard."""
    return service.get_admin_stats()


# ============================================================================
# 2. FAQ Management
# ============================================================================

@router.get(
    "/faqs",
    response_model=AdminFAQListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required."},
        404: {"model": ErrorResponse, "description": "Invalid college_id filter."},
    },
    summary="List FAQs with Filters and Search",
    description="Returns FAQ records with optional filtering by college_id, category, verification_status, and full-text keyword search.",
)
def list_faqs(
    college_id: str | None = Query(default=None, description="Optional college identifier filter."),
    category: str | None = Query(default=None, description="Optional FAQ category filter."),
    verification_status: Literal["VERIFIED", "PENDING_VERIFICATION"] | None = Query(
        default=None, description="Optional verification status filter."
    ),
    search: str | None = Query(default=None, description="Case-insensitive text search query."),
    _admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> AdminFAQListResponse:
    """List and filter institutional FAQs across all colleges or a single college."""
    return service.list_admin_faqs(
        college_id=college_id,
        category=category,
        verification_status=verification_status,
        search=search,
    )


@router.get(
    "/faqs/{faq_id}",
    response_model=FAQItem,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required."},
        404: {"model": ErrorResponse, "description": "FAQ not found."},
    },
    summary="Get Single FAQ",
    description="Retrieve a single FAQ item by its unique identifier.",
)
def get_faq(
    faq_id: str,
    _admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> FAQItem:
    """Retrieve an individual FAQ item."""
    return service.get_admin_faq(faq_id)


@router.post(
    "/faqs",
    response_model=FAQItem,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error."},
        401: {"model": ErrorResponse, "description": "Authentication required."},
        404: {"model": ErrorResponse, "description": "Invalid college_id."},
        409: {"model": ErrorResponse, "description": "Duplicate question within the same college."},
    },
    summary="Add New FAQ",
    description="Create a new FAQ record for a registered college. Validates college existence and prevents duplicate questions.",
)
def create_faq(
    payload: AdminFAQCreateRequest,
    admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> FAQItem:
    """Add a new FAQ record for an institution."""
    created = service.create_admin_faq(payload)
    logger.info(
        "Admin '%s' created FAQ id=%s for college='%s' category='%s' status='%s'",
        admin.username,
        created.id,
        created.college_id,
        created.category,
        created.verification_status,
    )
    return created


@router.put(
    "/faqs/{faq_id}",
    response_model=FAQItem,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error."},
        401: {"model": ErrorResponse, "description": "Authentication required."},
        404: {"model": ErrorResponse, "description": "FAQ or college not found."},
        409: {"model": ErrorResponse, "description": "Duplicate question within the same college."},
    },
    summary="Update FAQ",
    description="Update fields on an existing FAQ record. Prevents duplicate questions within the college scope.",
)
def update_faq(
    faq_id: str,
    payload: AdminFAQUpdateRequest,
    admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> FAQItem:
    """Update an existing FAQ record."""
    updated = service.update_admin_faq(faq_id, payload)
    logger.info(
        "Admin '%s' updated FAQ id=%s for college='%s' category='%s' status='%s'",
        admin.username,
        updated.id,
        updated.college_id,
        updated.category,
        updated.verification_status,
    )
    return updated


@router.patch(
    "/faqs/{faq_id}/verification",
    response_model=FAQItem,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required."},
        404: {"model": ErrorResponse, "description": "FAQ not found."},
    },
    summary="Update FAQ Verification Status",
    description="Quickly update or toggle an FAQ's verification status (VERIFIED or PENDING_VERIFICATION).",
)
def update_faq_verification(
    faq_id: str,
    payload: AdminFAQVerificationUpdateRequest,
    admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> FAQItem:
    """Update the verification status of an FAQ."""
    updated = service.update_admin_faq_verification(faq_id, payload)
    logger.info(
        "Admin '%s' changed FAQ id=%s verification status to '%s'",
        admin.username,
        updated.id,
        updated.verification_status,
    )
    return updated


@router.delete(
    "/faqs/{faq_id}",
    response_model=AdminFAQDeleteResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required."},
        404: {"model": ErrorResponse, "description": "FAQ not found."},
    },
    summary="Delete FAQ",
    description="Permanently delete an FAQ record from the institution knowledge base.",
)
def delete_faq(
    faq_id: str,
    admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> AdminFAQDeleteResponse:
    """Delete an existing FAQ record."""
    result = service.delete_admin_faq(faq_id)
    logger.info("Admin '%s' deleted FAQ id=%s", admin.username, faq_id)
    return result


# ============================================================================
# 3. College Management
# ============================================================================

@router.get(
    "/colleges",
    response_model=CollegeListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required."},
    },
    summary="List Registered Colleges",
    description="List all registered colleges with their metadata and verification counts.",
)
def list_colleges(
    _admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> CollegeListResponse:
    """List registered colleges for administrative management."""
    return service.list_colleges()


@router.get(
    "/colleges/{college_id}",
    response_model=CollegeDetailResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required."},
        404: {"model": ErrorResponse, "description": "College not found."},
    },
    summary="Get College Details",
    description="Retrieve full details for an individual registered college.",
)
def get_college(
    college_id: str,
    _admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> CollegeDetailResponse:
    """Retrieve college profile details."""
    return service.get_college_detail(college_id)


@router.post(
    "/colleges",
    response_model=CollegeDetailResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error."},
        401: {"model": ErrorResponse, "description": "Authentication required."},
        409: {"model": ErrorResponse, "description": "Duplicate college identifier."},
    },
    summary="Register New College",
    description="Register a new institutional profile. Enforces unique college_id constraint.",
)
def create_college(
    payload: AdminCollegeCreateRequest,
    admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> CollegeDetailResponse:
    """Register a new institution."""
    created = service.create_admin_college(payload)
    logger.info("Admin '%s' registered new college id='%s' name='%s'", admin.username, created.college_id, created.college_name)
    return created


@router.put(
    "/colleges/{college_id}",
    response_model=CollegeDetailResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error."},
        401: {"model": ErrorResponse, "description": "Authentication required."},
        404: {"model": ErrorResponse, "description": "College not found."},
    },
    summary="Update College Profile",
    description="Update metadata and institutional details for an existing college.",
)
def update_college(
    college_id: str,
    payload: AdminCollegeUpdateRequest,
    admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> CollegeDetailResponse:
    """Update institutional metadata for a college."""
    updated = service.update_admin_college(college_id, payload)
    logger.info("Admin '%s' updated college profile id='%s'", admin.username, updated.college_id)
    return updated


@router.delete(
    "/colleges/{college_id}",
    response_model=AdminCollegeDeleteResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Cannot delete college with existing FAQs."},
        401: {"model": ErrorResponse, "description": "Authentication required."},
        404: {"model": ErrorResponse, "description": "College not found."},
    },
    summary="Delete College",
    description="Safely delete a college profile. Deletion is blocked if any FAQ records remain associated with the college.",
)
def delete_college(
    college_id: str,
    admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> AdminCollegeDeleteResponse:
    """Safely delete a college with zero associated FAQs."""
    result = service.delete_admin_college(college_id)
    logger.info("Admin '%s' deleted college id='%s'", admin.username, college_id)
    return result


# ============================================================================
# 4. Student Feedback Management
# ============================================================================


@router.get(
    "/feedback/stats",
    response_model=AdminFeedbackStatsResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required."},
    },
    summary="Feedback Overview Statistics",
    description="Returns aggregate metrics including total, positive, negative counts, positive percentage, and breakdowns by college and reason.",
)
def get_feedback_stats(
    college_id: str | None = Query(default=None, description="Optional college filter (or 'ALL')."),
    _admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> AdminFeedbackStatsResponse:
    """Retrieve aggregate feedback metrics."""
    return service.get_admin_feedback_stats(college_id=college_id)


@router.get(
    "/feedback",
    response_model=AdminFeedbackListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required."},
    },
    summary="List Student Feedback",
    description="Returns paginated feedback records with filtering by college, rating, status, reason, or keyword search.",
)
def list_feedback(
    college_id: str | None = Query(default=None, description="Filter by college_id."),
    rating: str | None = Query(default=None, description="Filter by rating ('thumbs_up' or 'thumbs_down')."),
    status: str | None = Query(default=None, description="Filter by review status ('NEW', 'REVIEWED', 'RESOLVED', 'DISMISSED')."),
    reason: str | None = Query(default=None, description="Filter by feedback reason."),
    search: str | None = Query(default=None, description="Search question, answer, comment, or ID."),
    page: int = Query(default=1, ge=1, description="Page number."),
    limit: int = Query(default=10, ge=1, le=100, description="Items per page."),
    _admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> AdminFeedbackListResponse:
    """List and filter student feedback records."""
    return service.list_admin_feedback(
        college_id=college_id,
        rating=rating,
        status=status,
        reason=reason,
        search=search,
        page=page,
        limit=limit,
    )


@router.patch(
    "/feedback/{feedback_id}",
    response_model=FeedbackRecord,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required."},
        404: {"model": ErrorResponse, "description": "Feedback not found."},
    },
    summary="Update Feedback Review Status",
    description="Update review lifecycle status ('NEW', 'REVIEWED', 'RESOLVED', 'DISMISSED') and internal administrator notes.",
)
def update_feedback(
    feedback_id: str,
    payload: AdminFeedbackUpdateRequest,
    admin: AdminUserResponse = Depends(get_current_admin),
    service: ChatbotService = Depends(get_chatbot_service),
) -> FeedbackRecord:
    """Update review status and notes on a feedback entry."""
    updated = service.update_admin_feedback(feedback_id, payload)
    logger.info("Admin '%s' updated feedback id='%s' status='%s'", admin.username, feedback_id, updated.status)
    return updated


