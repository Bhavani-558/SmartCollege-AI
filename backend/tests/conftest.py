"""Shared pytest fixtures for backend unit and API tests."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI

# Ensure AI-Student-Chatbot root is importable regardless of test working directory.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.main import create_app
from backend.app.utils.config import Settings


class ASGITestClient:
    """Synchronous ASGI test wrapper compatible with FastAPI 0.104 + httpx 0.28."""

    def __init__(self, app: FastAPI, base_url: str = "http://testserver") -> None:
        self._app = app
        self._runner = asyncio.Runner()
        self._lifespan_cm = app.router.lifespan_context(app)
        self._async_client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url=base_url,
        )

    def __enter__(self) -> "ASGITestClient":
        self._runner.__enter__()
        self._runner.run(self._lifespan_cm.__aenter__())
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        try:
            self._runner.run(self._lifespan_cm.__aexit__(exc_type, exc_val, exc_tb))
        finally:
            self._runner.run(self._async_client.aclose())
            self._runner.__exit__(exc_type, exc_val, exc_tb)

    def get(self, url: str, **kwargs) -> httpx.Response:
        return self._runner.run(self._async_client.get(url, **kwargs))

    def post(self, url: str, **kwargs) -> httpx.Response:
        return self._runner.run(self._async_client.post(url, **kwargs))

    def put(self, url: str, **kwargs) -> httpx.Response:
        return self._runner.run(self._async_client.put(url, **kwargs))

    def patch(self, url: str, **kwargs) -> httpx.Response:
        return self._runner.run(self._async_client.patch(url, **kwargs))

    def delete(self, url: str, **kwargs) -> httpx.Response:
        return self._runner.run(self._async_client.delete(url, **kwargs))


@pytest.fixture(scope="session")
def test_settings(tmp_path_factory) -> Settings:
    """Return Settings pinned to isolated test copies of datasets and pre-trained models."""
    test_data_dir = tmp_path_factory.mktemp("admin_test_data")

    # Copy dataset files to isolated test directory so test CRUD never mutates dataset/processed/
    base_colleges = PROJECT_ROOT / "dataset" / "processed" / "colleges.json"
    base_faqs = PROJECT_ROOT / "dataset" / "processed" / "college_faq.json"

    test_colleges = test_data_dir / "colleges.json"
    test_faqs = test_data_dir / "college_faq.json"

    test_colleges.write_bytes(base_colleges.read_bytes())
    test_faqs.write_bytes(base_faqs.read_bytes())

    return Settings(
        faq_backend="json",
        database_url=None,
        colleges_path=test_colleges,
        college_faq_path=test_faqs,
        admin_username="test_admin",
        admin_password="TestAdminStrongPassword2026!",
        admin_jwt_secret="test-admin-jwt-secret-key-32-chars-long!!",
        revoked_tokens_path=test_data_dir / "revoked_tokens.json",
        feedback_path=test_data_dir / "student_feedback.json",
    )


@pytest.fixture(scope="session")
def client(test_settings: Settings):
    """Provide an ASGI client exercising lifespan startup and FastAPI routing."""
    application = create_app(custom_settings=test_settings)
    with ASGITestClient(application) as test_client:
        yield test_client
