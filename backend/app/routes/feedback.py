"""Public student feedback endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from backend.app.services.chatbot_service import ChatbotService
from backend.app.utils.dependencies import get_chatbot_service
from backend.app.utils.schemas import (
    ErrorResponse,
    FeedbackSubmitRequest,
    FeedbackSubmitResponse,
)

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


@router.post(
    "",
    response_model=FeedbackSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Validation or payload error."},
        404: {"model": ErrorResponse, "description": "Invalid or unregistered college_id."},
    },
    summary="Submit or update student feedback",
    description=(
        "Submits anonymous student feedback (rating, optional reason, optional comment) "
        "for a specific chatbot response. If feedback for the same session and message already exists, "
        "it updates the existing rating and comment, preventing duplicates."
    ),
)
def submit_feedback(
    payload: FeedbackSubmitRequest,
    service: ChatbotService = Depends(get_chatbot_service),
) -> FeedbackSubmitResponse:
    """Submit or update student feedback on a chatbot answer."""
    return service.submit_feedback(payload)

