"""Unit and integration tests for Student Feedback and Admin Feedback Management APIs."""

from __future__ import annotations

import uuid
import pytest

from backend.app.main import create_app
from backend.app.utils.config import Settings
from backend.tests.conftest import ASGITestClient


@pytest.fixture
def admin_headers(client: ASGITestClient, test_settings: Settings) -> dict[str, str]:
    """Helper fixture providing valid Bearer token headers for admin requests."""
    login_resp = client.post(
        "/api/admin/auth/login",
        json={
            "username": test_settings.admin_username,
            "password": test_settings.admin_password,
        },
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_submit_feedback_lifecycle(client: ASGITestClient) -> None:
    """Verify student feedback submission, duplicate prevention, and rating update."""
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    message_id = f"msg_{uuid.uuid4().hex[:8]}"

    # 1. Initial positive rating
    payload = {
        "session_id": session_id,
        "message_id": message_id,
        "college_id": "college_001",
        "question": "Where is the NRI University campus located?",
        "answer": "NRI University is located at Agiripalli.",
        "intent": "college_location",
        "rating": "thumbs_up",
    }
    resp = client.post("/api/feedback", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["is_updated"] is False
    assert data["message"] == "Thank you for your feedback!"
    assert data["feedback"]["rating"] == "thumbs_up"
    assert data["feedback"]["status"] == "NEW"
    assert data["feedback"]["college_id"] == "college_001"
    assert data["feedback"]["college_name"] == "NRI University"
    feedback_id = data["feedback"]["feedback_id"]

    # 2. Update to negative rating with reason and comment (same session + message)
    update_payload = {
        "session_id": session_id,
        "message_id": message_id,
        "college_id": "college_001",
        "question": "Where is the NRI University campus located?",
        "answer": "NRI University is located at Agiripalli.",
        "intent": "college_location",
        "rating": "thumbs_down",
        "reason": "Outdated information",
        "comment": "The campus pincode was missing.",
    }
    resp2 = client.post("/api/feedback", json=update_payload)
    assert resp2.status_code == 201
    data2 = resp2.json()
    assert data2["success"] is True
    assert data2["is_updated"] is True
    assert data2["message"] == "Feedback updated successfully."
    assert data2["feedback"]["feedback_id"] == feedback_id  # Preserves same ID
    assert data2["feedback"]["rating"] == "thumbs_down"
    assert data2["feedback"]["reason"] == "Outdated information"
    assert data2["feedback"]["comment"] == "The campus pincode was missing."


def test_feedback_validation(client: ASGITestClient) -> None:
    """Verify validation on required fields and invalid college."""
    # Invalid rating
    resp = client.post(
        "/api/feedback",
        json={
            "session_id": "s1",
            "message_id": "m1",
            "college_id": "college_001",
            "question": "Q",
            "answer": "A",
            "rating": "invalid_rating",
        },
    )
    assert resp.status_code == 422

    # Invalid college ID
    resp2 = client.post(
        "/api/feedback",
        json={
            "session_id": "s1",
            "message_id": "m1",
            "college_id": "college_nonexistent_999",
            "question": "Q",
            "answer": "A",
            "rating": "thumbs_up",
        },
    )
    assert resp2.status_code == 404
    assert resp2.json()["error_code"] == "INVALID_COLLEGE_ID"


def test_admin_feedback_endpoints_require_auth(client: ASGITestClient) -> None:
    """Verify all admin feedback endpoints reject unauthenticated requests."""
    assert client.get("/api/admin/feedback").status_code == 401
    assert client.get("/api/admin/feedback/stats").status_code == 401
    assert client.patch("/api/admin/feedback/fb_123", json={"status": "REVIEWED"}).status_code == 401


def test_admin_feedback_management_and_stats(
    client: ASGITestClient, admin_headers: dict[str, str]
) -> None:
    """Verify admin listing, filtering, search, stats, and review status lifecycle."""
    sess1 = f"s_{uuid.uuid4().hex[:6]}"
    sess2 = f"s_{uuid.uuid4().hex[:6]}"
    sess3 = f"s_{uuid.uuid4().hex[:6]}"

    fb1 = client.post(
        "/api/feedback",
        json={
            "session_id": sess1,
            "message_id": "m1",
            "college_id": "college_001",
            "question": "What are the NRI courses?",
            "answer": "NRI courses include BTech in CSE, AI, ECE.",
            "rating": "thumbs_up",
        },
    ).json()["feedback"]

    fb2 = client.post(
        "/api/feedback",
        json={
            "session_id": sess2,
            "message_id": "m2",
            "college_id": "college_002",
            "question": "Hostel fees at SRM?",
            "answer": "SRM hostel fees are 1,05,000 INR.",
            "rating": "thumbs_down",
            "reason": "Incorrect answer",
            "comment": "AC hostel fees are higher.",
        },
    ).json()["feedback"]

    fb3 = client.post(
        "/api/feedback",
        json={
            "session_id": sess3,
            "message_id": "m3",
            "college_id": "college_001",
            "question": "Placements at NRI?",
            "answer": "NRI placement rate is 88%.",
            "rating": "thumbs_down",
            "reason": "Incomplete answer",
            "comment": "Top recruiters were not listed.",
        },
    ).json()["feedback"]

    # 1. Test Admin Stats
    stats_resp = client.get("/api/admin/feedback/stats", headers=admin_headers)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_count"] >= 3
    assert stats["positive_count"] >= 1
    assert stats["negative_count"] >= 2
    assert "by_college" in stats
    assert "by_reason" in stats

    # Filter stats by college
    stats_col2 = client.get("/api/admin/feedback/stats?college_id=college_002", headers=admin_headers).json()
    assert stats_col2["total_count"] >= 1
    assert stats_col2["negative_count"] >= 1

    # 2. Test Admin List & Filters
    # Filter by college
    list_col1 = client.get("/api/admin/feedback?college_id=college_001", headers=admin_headers).json()
    assert list_col1["total_records"] >= 2
    assert all(r["college_id"] == "college_001" for r in list_col1["feedback"])

    # Filter by rating
    list_pos = client.get("/api/admin/feedback?rating=thumbs_up", headers=admin_headers).json()
    assert list_pos["total_records"] >= 1
    assert any(r["feedback_id"] == fb1["feedback_id"] for r in list_pos["feedback"])

    # Filter by reason
    list_reason = client.get("/api/admin/feedback?reason=Incorrect answer", headers=admin_headers).json()
    assert list_reason["total_records"] >= 1
    assert any(r["feedback_id"] == fb2["feedback_id"] for r in list_reason["feedback"])

    # Search keyword
    list_search = client.get("/api/admin/feedback?search=recruiters", headers=admin_headers).json()
    assert list_search["total_records"] >= 1
    assert any(r["feedback_id"] == fb3["feedback_id"] for r in list_search["feedback"])

    # 3. Test Status Update
    update_resp = client.patch(
        f"/api/admin/feedback/{fb2['feedback_id']}",
        headers=admin_headers,
        json={"status": "RESOLVED", "admin_notes": "Updated hostel fee disclosure in FAQ 35."},
    )
    assert update_resp.status_code == 200
    updated_fb = update_resp.json()
    assert updated_fb["status"] == "RESOLVED"
    assert updated_fb["admin_notes"] == "Updated hostel fee disclosure in FAQ 35."

    # Status 404 for unknown feedback ID
    assert client.patch(
        "/api/admin/feedback/fb_nonexistent_999",
        headers=admin_headers,
        json={"status": "REVIEWED"},
    ).status_code == 404


def test_feedback_persistence_across_restart(test_settings: Settings) -> None:
    """Verify that feedback records and status changes persist across app reloads."""
    # App instance 1
    app1 = create_app(test_settings)
    with ASGITestClient(app1) as c1:
        res = c1.post(
            "/api/feedback",
            json={
                "session_id": "persist_sess_unique",
                "message_id": "persist_msg_unique",
                "college_id": "college_003",
                "question": "What is KL University NIRF rank?",
                "answer": "KL University is ranked 35th in India.",
                "rating": "thumbs_up",
            },
        )
        assert res.status_code == 201
        fb_id = res.json()["feedback"]["feedback_id"]

    # App instance 2 (simulating backend restart)
    app2 = create_app(test_settings)
    with ASGITestClient(app2) as c2:
        login_resp = c2.post(
            "/api/admin/auth/login",
            json={
                "username": test_settings.admin_username,
                "password": test_settings.admin_password,
            },
        )
        assert login_resp.status_code == 200
        headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

        list_resp = c2.get("/api/admin/feedback", headers=headers)
        assert list_resp.status_code == 200
        records = list_resp.json()["feedback"]
        assert any(r["feedback_id"] == fb_id and r["college_id"] == "college_003" for r in records)
