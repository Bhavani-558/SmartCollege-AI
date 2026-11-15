"""Unit and integration tests for protected Admin APIs (Phase 2)."""

from __future__ import annotations

import pytest

from backend.app.utils.admin_auth import clear_revoked_tokens
from backend.app.utils.config import Settings
from backend.tests.conftest import ASGITestClient


@pytest.fixture(autouse=True)
def _reset_revocations():
    """Ensure clean revocation state for every test."""
    clear_revoked_tokens()
    yield
    clear_revoked_tokens()


@pytest.fixture
def auth_headers(client: ASGITestClient, test_settings: Settings) -> dict[str, str]:
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


# ============================================================================
# 1. Security & Protection Tests
# ============================================================================

def test_unauthenticated_admin_endpoints_return_401(client: ASGITestClient) -> None:
    """All admin endpoints reject requests missing the Authorization header."""
    endpoints = [
        ("GET", "/api/admin/stats"),
        ("GET", "/api/admin/faqs"),
        ("GET", "/api/admin/faqs/1"),
        ("POST", "/api/admin/faqs"),
        ("PUT", "/api/admin/faqs/1"),
        ("PATCH", "/api/admin/faqs/1/verification"),
        ("DELETE", "/api/admin/faqs/1"),
        ("GET", "/api/admin/colleges"),
        ("GET", "/api/admin/colleges/college_001"),
        ("POST", "/api/admin/colleges"),
        ("PUT", "/api/admin/colleges/college_001"),
        ("DELETE", "/api/admin/colleges/college_001"),
    ]

    for method, path in endpoints:
        if method == "GET":
            resp = client.get(path)
        elif method == "POST":
            resp = client.post(path, json={})
        elif method == "PUT":
            resp = client.put(path, json={})
        elif method == "PATCH":
            resp = client.patch(path, json={})
        elif method == "DELETE":
            resp = client.delete(path)
        assert resp.status_code == 401, f"{method} {path} did not return 401"
        assert resp.json()["error_code"] == "UNAUTHORIZED"


def test_invalid_and_revoked_tokens_return_401(client: ASGITestClient, auth_headers: dict[str, str]) -> None:
    """Invalid tokens and revoked tokens are rejected with 401 Unauthorized."""
    # 1. Garbage token
    bad_resp = client.get(
        "/api/admin/stats",
        headers={"Authorization": "Bearer invalid.garbage.token"},
    )
    assert bad_resp.status_code == 401
    assert bad_resp.json()["error_code"] == "UNAUTHORIZED"

    # 2. Revoked token after logout
    logout_resp = client.post("/api/admin/auth/logout", headers=auth_headers)
    assert logout_resp.status_code == 200

    revoked_resp = client.get("/api/admin/stats", headers=auth_headers)
    assert revoked_resp.status_code == 401
    assert revoked_resp.json()["error_code"] == "UNAUTHORIZED"


# ============================================================================
# 2. Dashboard Statistics Tests
# ============================================================================

def test_admin_dashboard_stats_success(client: ASGITestClient, auth_headers: dict[str, str]) -> None:
    """Protected /api/admin/stats returns aggregate metrics for colleges and FAQs."""
    resp = client.get("/api/admin/stats", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_colleges"] == 5
    assert data["total_faqs"] == 150
    assert data["verified_faqs"] == 117
    assert data["pending_faqs"] == 33
    assert len(data["colleges"]) == 5

    # Verify per-college breakdown
    c_ids = {c["college_id"] for c in data["colleges"]}
    assert c_ids == {"college_001", "college_002", "college_003", "college_004", "college_005"}


# ============================================================================
# 3. FAQ Management Tests
# ============================================================================

def test_admin_list_faqs_with_filters_and_search(client: ASGITestClient, auth_headers: dict[str, str]) -> None:
    """Admin can list FAQs with optional college, verification_status, and search filters."""
    # 1. All FAQs
    all_resp = client.get("/api/admin/faqs", headers=auth_headers)
    assert all_resp.status_code == 200
    all_data = all_resp.json()
    assert all_data["total_records"] == 150
    assert all_data["verified_count"] == 117
    assert all_data["pending_count"] == 33

    # 2. Filter by college
    c1_resp = client.get("/api/admin/faqs?college_id=college_001", headers=auth_headers)
    assert c1_resp.status_code == 200
    c1_data = c1_resp.json()
    assert c1_data["total_records"] == 30
    assert all(f["college_id"] == "college_001" for f in c1_data["faqs"])

    # 3. Filter by verification status
    v_resp = client.get("/api/admin/faqs?verification_status=VERIFIED", headers=auth_headers)
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["total_records"] == 117
    assert all(f["verification_status"] == "VERIFIED" for f in v_data["faqs"])

    p_resp = client.get("/api/admin/faqs?verification_status=PENDING_VERIFICATION", headers=auth_headers)
    assert p_resp.status_code == 200
    p_data = p_resp.json()
    assert p_data["total_records"] == 33
    assert all(f["verification_status"] == "PENDING_VERIFICATION" for f in p_data["faqs"])

    # 4. Search query
    search_resp = client.get("/api/admin/faqs?search=library", headers=auth_headers)
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert search_data["total_records"] > 0
    assert all(
        "library" in f["question"].lower()
        or "library" in f["answer"].lower()
        or "library" in f["category"].lower()
        for f in search_data["faqs"]
    )


def test_admin_get_faq_by_id(client: ASGITestClient, auth_headers: dict[str, str]) -> None:
    """Admin can retrieve a single FAQ by ID or receive 404 if not found."""
    # First get an existing FAQ ID
    faqs_resp = client.get("/api/admin/faqs?college_id=college_001", headers=auth_headers)
    first_faq = faqs_resp.json()["faqs"][0]
    faq_id = first_faq["id"]

    # Retrieve by ID
    get_resp = client.get(f"/api/admin/faqs/{faq_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == faq_id
    assert data["college_id"] == "college_001"
    assert data["question"] == first_faq["question"]

    # Non-existent ID -> 404
    missing_resp = client.get("/api/admin/faqs/999999", headers=auth_headers)
    assert missing_resp.status_code == 404
    assert missing_resp.json()["error_code"] == "NOT_FOUND"


def test_admin_create_faq_lifecycle(client: ASGITestClient, auth_headers: dict[str, str]) -> None:
    """Admin can create a new FAQ with validation, duplicate checks, and status handling."""
    # 1. Invalid college_id -> 404
    bad_col = client.post(
        "/api/admin/faqs",
        headers=auth_headers,
        json={
            "college_id": "college_999",
            "category": "admissions",
            "question": "What is the admission procedure?",
            "answer": "Test admission answer.",
            "source": "https://example.com",
            "verification_status": "PENDING_VERIFICATION",
        },
    )
    assert bad_col.status_code == 404
    assert bad_col.json()["error_code"] == "INVALID_COLLEGE_ID"

    # 2. Create valid FAQ
    new_q = "What are the new campus transportation routes for 2026?"
    create_resp = client.post(
        "/api/admin/faqs",
        headers=auth_headers,
        json={
            "college_id": "college_001",
            "category": "facilities",
            "question": new_q,
            "answer": "New bus routes are operational from Vijayawada and Guntur.",
            "source": "https://rvrnriuniversity.edu.in/transportation/",
            "verification_status": "PENDING_VERIFICATION",
        },
    )
    assert create_resp.status_code == 201
    created_faq = create_resp.json()
    new_id = created_faq["id"]
    assert created_faq["college_id"] == "college_001"
    assert created_faq["college_name"] == "NRI University"
    assert created_faq["question"] == new_q
    assert created_faq["verification_status"] == "PENDING_VERIFICATION"

    # 3. Duplicate question in same college -> 409
    dup_resp = client.post(
        "/api/admin/faqs",
        headers=auth_headers,
        json={
            "college_id": "college_001",
            "category": "facilities",
            "question": new_q.lower(),  # Case-insensitive duplicate
            "answer": "Duplicate answer attempt.",
            "source": "https://rvrnriuniversity.edu.in/transportation/",
            "verification_status": "PENDING_VERIFICATION",
        },
    )
    assert dup_resp.status_code == 409
    assert dup_resp.json()["error_code"] == "DUPLICATE_QUESTION"

    # 4. Same question in DIFFERENT college is ALLOWED (college isolation)
    diff_col_resp = client.post(
        "/api/admin/faqs",
        headers=auth_headers,
        json={
            "college_id": "college_002",
            "category": "facilities",
            "question": new_q,
            "answer": "SRM-AP bus routes operate across Amaravati and Vijayawada.",
            "source": "https://srmap.edu.in/transport/",
            "verification_status": "PENDING_VERIFICATION",
        },
    )
    assert diff_col_resp.status_code == 201
    srm_id = diff_col_resp.json()["id"]

    # 5. Clean up the created test FAQs
    del_resp1 = client.delete(f"/api/admin/faqs/{new_id}", headers=auth_headers)
    assert del_resp1.status_code == 200
    del_resp2 = client.delete(f"/api/admin/faqs/{srm_id}", headers=auth_headers)
    assert del_resp2.status_code == 200


def test_admin_update_and_verification_toggle(client: ASGITestClient, auth_headers: dict[str, str]) -> None:
    """Admin can update FAQ content, toggle verification, and delete."""
    # Create a temporary FAQ to edit
    create_resp = client.post(
        "/api/admin/faqs",
        headers=auth_headers,
        json={
            "college_id": "college_002",
            "category": "scholarships",
            "question": "Are special robotics scholarships available?",
            "answer": "Initial pending answer.",
            "source": "https://srmap.edu.in/scholarships/",
            "verification_status": "PENDING_VERIFICATION",
        },
    )
    assert create_resp.status_code == 201
    faq = create_resp.json()
    faq_id = faq["id"]

    # 1. Update text content
    update_resp = client.put(
        f"/api/admin/faqs/{faq_id}",
        headers=auth_headers,
        json={
            "answer": "Updated: Up to 50% tuition fee waiver for robotics achievers.",
            "source": "https://srmap.edu.in/scholarships/robotics",
        },
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert "Updated: Up to 50%" in updated["answer"]
    assert updated["source"] == "https://srmap.edu.in/scholarships/robotics"

    # 2. Toggle verification to VERIFIED
    verify_resp = client.patch(
        f"/api/admin/faqs/{faq_id}/verification",
        headers=auth_headers,
        json={"verification_status": "VERIFIED"},
    )
    assert verify_resp.status_code == 200
    verified_data = verify_resp.json()
    assert verified_data["verification_status"] == "VERIFIED"
    assert verified_data["last_verified"] != "PENDING_VERIFICATION"

    # 3. Toggle verification back to PENDING_VERIFICATION
    pending_resp = client.patch(
        f"/api/admin/faqs/{faq_id}/verification",
        headers=auth_headers,
        json={"verification_status": "PENDING_VERIFICATION"},
    )
    assert pending_resp.status_code == 200
    assert pending_resp.json()["verification_status"] == "PENDING_VERIFICATION"

    # 4. Delete the FAQ
    delete_resp = client.delete(f"/api/admin/faqs/{faq_id}", headers=auth_headers)
    assert delete_resp.status_code == 200
    assert delete_resp.json()["success"] is True

    # 5. Subsequent GET returns 404
    get_deleted = client.get(f"/api/admin/faqs/{faq_id}", headers=auth_headers)
    assert get_deleted.status_code == 404


# ============================================================================
# 4. College Management Tests
# ============================================================================

def test_admin_colleges_crud_and_deletion_protection(client: ASGITestClient, auth_headers: dict[str, str]) -> None:
    """Admin can list, view, add, update, and safely delete colleges without altering existing 5 institutions."""
    # 1. List colleges
    list_resp = client.get("/api/admin/colleges", headers=auth_headers)
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total_colleges"] >= 5

    # 2. Get single college detail
    c1_resp = client.get("/api/admin/colleges/college_001", headers=auth_headers)
    assert c1_resp.status_code == 200
    assert c1_resp.json()["college_name"] == "NRI University"

    # 3. Deletion protection: attempting to delete college_001 (has 30 FAQs) must fail with 400
    del_c1 = client.delete("/api/admin/colleges/college_001", headers=auth_headers)
    assert del_c1.status_code == 400
    assert del_c1.json()["error_code"] == "COLLEGE_HAS_FAQS"

    # 4. Create new college
    new_cid = "college_006"
    create_col = client.post(
        "/api/admin/colleges",
        headers=auth_headers,
        json={
            "college_id": new_cid,
            "college_name": "Andhra University Test Campus",
            "official_name": "Andhra University Visakhapatnam",
            "short_code": "AU",
            "location": "Visakhapatnam, Andhra Pradesh",
            "ugc_status": "State University",
            "official_sources": ["https://andhrauniversity.edu.in"],
            "supported_categories": ["general_information", "admissions"],
        },
    )
    assert create_col.status_code == 201
    created_profile = create_col.json()
    assert created_profile["college_id"] == new_cid
    assert created_profile["college_name"] == "Andhra University Test Campus"

    # 5. Duplicate college_id rejected -> 409
    dup_col = client.post(
        "/api/admin/colleges",
        headers=auth_headers,
        json={
            "college_id": new_cid,
            "college_name": "Duplicate AU",
        },
    )
    assert dup_col.status_code == 409
    assert dup_col.json()["error_code"] == "DUPLICATE_COLLEGE_ID"

    # 6. Update college
    update_col = client.put(
        f"/api/admin/colleges/{new_cid}",
        headers=auth_headers,
        json={"location": "Waltair, Visakhapatnam, Andhra Pradesh"},
    )
    assert update_col.status_code == 200
    assert "Waltair" in update_col.json()["location"]

    # 7. Delete college_006 safely (has 0 FAQs) -> 200
    del_c6 = client.delete(f"/api/admin/colleges/{new_cid}", headers=auth_headers)
    assert del_c6.status_code == 200
    assert del_c6.json()["success"] is True

    # 8. Subsequent get returns 404
    get_deleted_c6 = client.get(f"/api/admin/colleges/{new_cid}", headers=auth_headers)
    assert get_deleted_c6.status_code == 404


# ============================================================================
# 5. Student API Independence
# ============================================================================

def test_student_apis_remain_unaffected(client: ASGITestClient) -> None:
    """Student chatbot and public college directories continue working without authentication."""
    # Colleges listing
    col_resp = client.get("/api/colleges")
    assert col_resp.status_code == 200
    assert col_resp.json()["total_colleges"] == 5

    # Chat query
    chat_resp = client.post(
        "/api/chat",
        json={"question": "Where is the NRI University campus located?", "college_id": "college_001"},
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert chat_data["verification_status"] == "VERIFIED"
    assert "Agiripalli" in chat_data["answer"]

