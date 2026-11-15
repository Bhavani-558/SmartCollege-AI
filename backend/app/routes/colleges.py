"""College listing, profile retrieval, selection, and scoped FAQ routes."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query

from backend.app.services.chatbot_service import ChatbotService
from backend.app.utils.dependencies import get_chatbot_service
from backend.app.utils.schemas import (
    CollegeDetailResponse,
    CollegeFAQListResponse,
    CollegeListResponse,
    CollegeSelectRequest,
    CollegeSelectResponse,
    ErrorResponse,
)

router = APIRouter(prefix="/api/colleges", tags=["Colleges"])


@router.get(
    "",
    response_model=CollegeListResponse,
    summary="List registered colleges",
    description="Lists all registered college profiles with VERIFIED and PENDING_VERIFICATION FAQ counts.",
)
def list_colleges(
    service: ChatbotService = Depends(get_chatbot_service),
) -> CollegeListResponse:
    """List registered college summaries."""
    return service.list_colleges()


@router.post(
    "/select",
    response_model=CollegeSelectResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Select or switch active college",
    description=(
        "Validates the target college_id, resets prior college context when switching colleges, "
        "and returns supported categories and FAQ counts."
    ),
)
def select_college(
    payload: CollegeSelectRequest,
    service: ChatbotService = Depends(get_chatbot_service),
) -> CollegeSelectResponse:
    """Select or switch a student's active college."""
    return service.select_college(
        college_id=payload.college_id,
        previous_college_id=payload.previous_college_id,
    )


@router.get(
    "/{college_id}",
    response_model=CollegeDetailResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Get college profile details",
    description="Returns the institutional profile strictly scoped to the specified college_id.",
)
def get_college_detail(
    college_id: str,
    service: ChatbotService = Depends(get_chatbot_service),
) -> CollegeDetailResponse:
    """Retrieve profile details for one college_id."""
    return service.get_college_detail(college_id)


@router.get(
    "/{college_id}/faqs",
    response_model=CollegeFAQListResponse,
    responses={404: {"model": ErrorResponse}},
    summary="List FAQs for a single college",
    description=(
        "Returns FAQ records isolated strictly by college_id, with optional category "
        "and verification_status filtering."
    ),
)
def get_college_faqs(
    college_id: str,
    category: str | None = Query(default=None, description="Filter by FAQ category."),
    verification_status: Literal["VERIFIED", "PENDING_VERIFICATION"] | None = Query(
        default=None,
        description="Filter by verification status.",
    ),
    service: ChatbotService = Depends(get_chatbot_service),
) -> CollegeFAQListResponse:
    """Retrieve strictly college-isolated FAQ records."""
    return service.get_college_faqs(
        college_id=college_id,
        category=category,
        verification_status=verification_status,
    )

