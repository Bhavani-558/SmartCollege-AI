"""FastAPI application entrypoint for the AI-Powered Multi-College Student Chatbot."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.routes import (
    admin_auth_router,
    admin_router,
    chat_router,
    colleges_router,
    feedback_router,
    health_router,
)
from backend.app.services.data_store import ChatbotDomainError
from backend.app.utils.config import Settings, get_settings
from backend.app.utils.dependencies import build_chatbot_service
from backend.app.utils.schemas import ErrorResponse


def create_app(custom_settings: Settings | None = None) -> FastAPI:
    """Application factory configured with OpenAPI docs, exception handlers, and routers."""
    active_settings = custom_settings or get_settings()

    @asynccontextmanager
    async def lifespan(app_instance: FastAPI):
        app_instance.state.settings = active_settings
        app_instance.state.chatbot_service = build_chatbot_service(active_settings)
        yield

    application = FastAPI(
        title=active_settings.app_name,
        version=active_settings.app_version,
        description=(
            "FastAPI backend for the AI-Powered Multi-College Chatbot for Student Queries. "
            "Combines a pre-trained Scikit-learn TF-IDF + Logistic Regression intent classifier "
            "with strictly isolated per-college FAQ retrieval and PostgreSQL-ready persistence."
        ),
        openapi_tags=[
            {"name": "Health", "description": "Service overview and runtime readiness checks."},
            {"name": "Colleges", "description": "College listing, selection, and isolated FAQ access."},
            {"name": "Chatbot", "description": "Intent classification and verification-aware QA."},
            {
                "name": "Admin Authentication",
                "description": "Secure administrator login, token revocation, and profile checks.",
            },
            {
                "name": "Admin Dashboard",
                "description": "Protected endpoints for administrator stats, FAQ CRUD, and college management.",
            },
        ],
        lifespan=lifespan,
    )

    application.state.settings = active_settings
    application.dependency_overrides[get_settings] = lambda: active_settings

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173",
                       "http://127.0.0.1:5174",
                       "http://localhost:5174",],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    @application.exception_handler(ChatbotDomainError)
    async def domain_error_handler(
        _request: Request,
        exc: ChatbotDomainError,
    ) -> JSONResponse:
        error_payload = ErrorResponse(
            detail=exc.detail,
            error_code=exc.error_code,
            context=exc.context,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload.model_dump(),
        )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(
        _request: Request,
        _exc: Exception,
    ) -> JSONResponse:
        error_payload = ErrorResponse(
            detail="An unexpected internal server error occurred.",
            error_code="INTERNAL_SERVER_ERROR",
        )
        return JSONResponse(
            status_code=500,
            content=error_payload.model_dump(),
        )

    application.include_router(health_router)
    application.include_router(colleges_router)
    application.include_router(chat_router)
    application.include_router(feedback_router)
    application.include_router(admin_auth_router)
    application.include_router(admin_router)

    return application


app = create_app()

