"""Student chatbot query endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.app.services.chatbot_service import ChatbotService
from backend.app.utils.dependencies import get_chatbot_service
from backend.app.utils.schemas import ChatRequest, ChatResponse, ErrorResponse

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])


@router.post(
    "",
    response_model=ChatResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Empty question or missing college_id."},
        404: {"model": ErrorResponse, "description": "Invalid or unregistered college_id."},
    },
    summary="Ask a student query",
    description=(
        "Classifies the student's question with the pre-trained TF-IDF + Logistic Regression "
        "model. General intents return conversational replies. College-specific intents require "
        "a valid college_id and return VERIFIED FAQs or an explicit PENDING_VERIFICATION notice, "
        "strictly isolating data per college."
    ),
)
def chat_query(
    payload: ChatRequest,
    service: ChatbotService = Depends(get_chatbot_service),
) -> ChatResponse:
    """Process a student chatbot query with strict college_id isolation."""
    return service.process_query(
        question=payload.question,
        college_id=payload.college_id,
        confidence_threshold=payload.confidence_threshold,
    )

