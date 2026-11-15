"""API tests for health check, college listing, college selection, and scoped FAQs."""

from __future__ import annotations

from pathlib import Path

from backend.app.services.postgres_repository import PostgresDataStore
from backend.tests.conftest import ASGITestClient

EXPECTED_COLLEGES = {
    "college_001": {
        "college_name": "NRI University",
        "short_code": "NRIU",
        "is_primary_profile": True,
        "profile_status": "PARTIALLY_VERIFIED",
        "verified_faq_count": 15,
        "pending_faq_count": 15,
        "location": "Agiripalli, Vijayawada Rural, Andhra Pradesh",
        "logo_url": "/logos/college_001.png",
        "source": "https://nriuniversity.in/",
    },
    "college_002": {
        "college_name": "SRM University-AP",
        "short_code": "SRMAP",
        "is_primary_profile": False,
        "profile_status": "VERIFIED",
        "verified_faq_count": 23,
        "pending_faq_count": 7,
        "location": "Neerukonda, Mangalagiri, Andhra Pradesh",
        "logo_url": "/logos/college_002.png",
        "source": "https://www.srmap.edu.in/",
    },
    "college_003": {
        "college_name": "KL Deemed to be University",
        "short_code": "KLU",
        "is_primary_profile": False,
        "profile_status": "VERIFIED",
        "verified_faq_count": 28,
        "pending_faq_count": 2,
        "location": "Vaddeswaram, Guntur District, Andhra Pradesh",
        "logo_url": "/logos/college_003.png",
        "source": "https://www.kluniversity.in/",
    },
    "college_004": {
        "college_name": "Siddhartha Academy of Higher Education",
        "short_code": "SAHE",
        "is_primary_profile": False,
        "profile_status": "VERIFIED",
        "verified_faq_count": 25,
        "pending_faq_count": 5,
        "location": "Kanuru, Vijayawada, Andhra Pradesh",
        "logo_url": "/logos/college_004.jpg",
        "source": "https://siddhartha.edu.in/",
    },
    "college_005": {
        "college_name": "Prasad V Potluri Siddhartha Institute of Technology",
        "short_code": "PVPSIT",
        "is_primary_profile": False,
        "profile_status": "VERIFIED",
        "verified_faq_count": 26,
        "pending_faq_count": 4,
        "location": "Kanuru, Vijayawada, Andhra Pradesh",
        "logo_url": "/logos/college_005.png",
        "source": "https://www.pvpsiddhartha.ac.in/",
    },
}


def test_health_and_root_endpoints(client: ASGITestClient) -> None:
    """Root, health, and OpenAPI schema endpoints report loaded classifier and 5 colleges."""
    root_resp = client.get("/")
    assert root_resp.status_code == 200
    assert root_resp.json()["chat_url"] == "/api/chat"

    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    payload = health_resp.json()
    assert payload["status"] == "ok"
    assert payload["active_faq_backend"] == "json"
    assert payload["postgres_prepared"] is True
    assert payload["intent_classifier_loaded"] is True
    assert payload["num_intents"] == 30
    assert payload["total_colleges"] == 5

    openapi_resp = client.get("/openapi.json")
    assert openapi_resp.status_code == 200
    paths = openapi_resp.json()["paths"]
    assert "/health" in paths
    assert "/api/colleges" in paths
    assert "/api/colleges/select" in paths
    assert "/api/colleges/{college_id}" in paths
    assert "/api/colleges/{college_id}/faqs" in paths
    assert "/api/chat" in paths


def test_list_colleges_and_profile_counts(client: ASGITestClient) -> None:
    """College listing includes all 5 verified AP colleges with location, logo, and FAQ counts."""
    response = client.get("/api/colleges")
    assert response.status_code == 200
    data = response.json()
    assert data["total_colleges"] == 5

    by_id = {item["college_id"]: item for item in data["colleges"]}
    assert set(by_id.keys()) == set(EXPECTED_COLLEGES.keys())

    for cid, expected in EXPECTED_COLLEGES.items():
        row = by_id[cid]
        assert row["college_name"] == expected["college_name"]
        assert row["short_code"] == expected["short_code"]
        assert row["is_primary_profile"] is expected["is_primary_profile"]
        assert row["profile_status"] == expected["profile_status"]
        assert row["verified_faq_count"] == expected["verified_faq_count"]
        assert row["pending_faq_count"] == expected["pending_faq_count"]
        assert row["location"] == expected["location"]
        assert row["logo_url"] == expected["logo_url"]


def test_get_college_detail_valid_and_invalid(client: ASGITestClient) -> None:
    """Detail endpoint returns official profile metadata for each of the 5 colleges and 404 otherwise."""
    for cid, expected in EXPECTED_COLLEGES.items():
        ok_resp = client.get(f"/api/colleges/{cid}")
        assert ok_resp.status_code == 200
        detail = ok_resp.json()
        assert detail["college_id"] == cid
        assert detail["college_name"] == expected["college_name"]
        assert detail["location"] == expected["location"]
        assert detail["logo_url"] == expected["logo_url"]
        assert expected["source"] in detail["official_sources"]

    # Ensure SAHE (college_004) and PVPSIT (college_005) stay strictly distinct.
    sahe = client.get("/api/colleges/college_004").json()
    pvpsit = client.get("/api/colleges/college_005").json()
    assert sahe["short_code"] == "SAHE"
    assert pvpsit["short_code"] == "PVPSIT"
    assert sahe["college_name"] != pvpsit["college_name"]
    assert set(sahe["official_sources"]).isdisjoint(set(pvpsit["official_sources"]))

    missing_resp = client.get("/api/colleges/nonexistent_college")
    assert missing_resp.status_code == 404
    err = missing_resp.json()
    assert err["error_code"] == "INVALID_COLLEGE_ID"


def test_select_and_switch_college_resets_context(client: ASGITestClient) -> None:
    """Selecting and switching colleges confirms context reset across all 5 colleges."""
    select_first = client.post("/api/colleges/select", json={"college_id": "college_001"})
    assert select_first.status_code == 200
    first_data = select_first.json()
    assert first_data["selected_college"]["college_id"] == "college_001"
    assert first_data["context_reset"] is True
    assert "admissions" in first_data["supported_categories"]

    switch_resp = client.post(
        "/api/colleges/select",
        json={"college_id": "college_004", "previous_college_id": "college_001"},
    )
    assert switch_resp.status_code == 200
    switch_data = switch_resp.json()
    assert switch_data["selected_college"]["college_id"] == "college_004"
    assert switch_data["previous_college_id"] == "college_001"
    assert switch_data["context_reset"] is True
    assert "Switched active college" in switch_data["message"]

    switch_to_pvpsit = client.post(
        "/api/colleges/select",
        json={"college_id": "college_005", "previous_college_id": "college_004"},
    )
    assert switch_to_pvpsit.status_code == 200
    pvpsit_data = switch_to_pvpsit.json()
    assert pvpsit_data["selected_college"]["college_id"] == "college_005"
    assert pvpsit_data["previous_college_id"] == "college_004"
    assert pvpsit_data["context_reset"] is True

    bad_select = client.post("/api/colleges/select", json={"college_id": "college_999"})
    assert bad_select.status_code == 404
    assert bad_select.json()["error_code"] == "INVALID_COLLEGE_ID"


def test_scoped_college_faqs_endpoint(client: ASGITestClient) -> None:
    """College FAQ listing returns strictly 30 isolated FAQs per college with verified/pending filters."""
    for cid, expected in EXPECTED_COLLEGES.items():
        all_resp = client.get(f"/api/colleges/{cid}/faqs")
        assert all_resp.status_code == 200
        all_data = all_resp.json()
        assert all_data["college_id"] == cid
        assert len(all_data["faqs"]) == 30
        assert all_data["verified_count"] == expected["verified_faq_count"]
        assert all_data["pending_count"] == expected["pending_faq_count"]
        assert all(faq["college_id"] == cid for faq in all_data["faqs"])

        verified_only = client.get(
            f"/api/colleges/{cid}/faqs",
            params={"verification_status": "VERIFIED"},
        )
        assert verified_only.status_code == 200
        v_data = verified_only.json()
        assert v_data["verified_count"] == expected["verified_faq_count"]
        assert v_data["pending_count"] == 0
        assert all(faq["college_id"] == cid for faq in v_data["faqs"])
        assert all(faq["verification_status"] == "VERIFIED" for faq in v_data["faqs"])


def test_prepared_sql_repository_sync_and_isolation(tmp_path: Path, test_settings) -> None:
    """Prepared SQLAlchemy repository syncs 5 colleges / 150 FAQs and preserves metadata & isolation."""
    db_file = tmp_path / "prepared_chatbot.db"
    repo = PostgresDataStore(
        database_url=f"sqlite:///{db_file.as_posix()}",
        intents_path=test_settings.intents_path,
    )
    sync_stats = repo.sync_from_json_data(
        colleges_path=test_settings.colleges_path,
        college_faq_path=test_settings.college_faq_path,
    )
    assert sync_stats == {"colleges_synced": 5, "faqs_synced": 150}

    for cid, expected in EXPECTED_COLLEGES.items():
        summary = repo.get_college_summary(cid)
        assert summary["location"] == expected["location"]
        assert summary["logo_url"] == expected["logo_url"]
        best, _other, _pend = repo.lookup_category_faqs(
            college_id=cid,
            category="college_location",
            question="Where is the campus located?",
        )
        assert best is not None
        assert best["college_id"] == cid
        assert best["verification_status"] == "VERIFIED"

    # Pending category in college_003 (syllabus) stays pending without leaking another college's syllabus.
    best_c3_syl, other_c3_syl, pend_c3_syl = repo.lookup_category_faqs(
        college_id="college_003",
        category="syllabus",
        question="Where can I download the semester syllabus?",
    )
    assert best_c3_syl is None
    assert other_c3_syl == []
    assert len(pend_c3_syl) >= 1
    assert all(item["college_id"] == "college_003" for item in pend_c3_syl)
