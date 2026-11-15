"""Health and API discovery routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.app.services.chatbot_service import ChatbotService
from backend.app.utils.dependencies import get_chatbot_service
from backend.app.utils.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/",
    summary="API root overview",
    description="Returns service metadata and primary REST API endpoints.",
)
def read_root(
    service: ChatbotService = Depends(get_chatbot_service),
) -> dict[str, object]:
    """Provide root API navigation links."""
    return {
        "name": service.app_name,
        "version": service.app_version,
        "docs_url": "/docs",
        "health_url": "/health",
        "colleges_url": "/api/colleges",
        "chat_url": "/api/chat",
    }


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health and readiness check",
    description="Reports intent classifier status, active FAQ backend, and college count.",
)
def health_check(
    service: ChatbotService = Depends(get_chatbot_service),
) -> HealthResponse:
    """Return service health and configuration status."""
    return service.get_health_status()

