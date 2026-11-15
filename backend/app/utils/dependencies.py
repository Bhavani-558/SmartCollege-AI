"""FastAPI dependency providers for constructing and resolving ChatbotService."""

from __future__ import annotations

from fastapi import Request

from backend.app.services.chatbot_service import ChatbotService
from backend.app.services.data_store import JsonDataStore
from backend.app.services.intent_classifier import IntentClassifier
from backend.app.services.postgres_repository import PostgresDataStore
from backend.app.utils.config import Settings, get_settings


def build_chatbot_service(settings: Settings | None = None) -> ChatbotService:
    """Instantiate ChatbotService with the configured FAQ repository and warm classifier."""
    active_settings = settings or get_settings()
    backend_name = active_settings.faq_backend.strip().lower()

    if backend_name == "postgres" and active_settings.database_url:
        data_store = PostgresDataStore(
            database_url=active_settings.database_url,
            intents_path=active_settings.intents_path,
        )
        active_backend = "postgres"
    else:
        data_store = JsonDataStore(
            intents_path=active_settings.intents_path,
            colleges_path=active_settings.colleges_path,
            college_faq_path=active_settings.college_faq_path,
            feedback_path=active_settings.feedback_path,
        )
        active_backend = "json"

    # Preload existing Joblib classifier and TF-IDF vectorizer without retraining.
    IntentClassifier(models_dir=active_settings.models_dir)

    return ChatbotService(
        data_store=data_store,
        models_dir=active_settings.models_dir,
        confidence_threshold=active_settings.confidence_threshold,
        app_name=active_settings.app_name,
        app_version=active_settings.app_version,
        active_faq_backend=active_backend,
        postgres_configured=bool(active_settings.database_url),
    )


def get_chatbot_service(request: Request) -> ChatbotService:
    """Resolve the ChatbotService from app.state with lazy fallback."""
    service = getattr(request.app.state, "chatbot_service", None)
    if service is None:
        settings = getattr(request.app.state, "settings", None)
        service = build_chatbot_service(settings)
        request.app.state.chatbot_service = service
    return service

