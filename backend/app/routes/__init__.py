"""API router exports."""

from backend.app.routes.admin import router as admin_router
from backend.app.routes.admin_auth import router as admin_auth_router
from backend.app.routes.chat import router as chat_router
from backend.app.routes.colleges import router as colleges_router
from backend.app.routes.feedback import router as feedback_router
from backend.app.routes.health import router as health_router

__all__ = [
    "admin_router",
    "admin_auth_router",
    "chat_router",
    "colleges_router",
    "feedback_router",
    "health_router",
]



