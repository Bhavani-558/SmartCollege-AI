"""API tests for chatbot intent routing, verification rules, and cross-college isolation."""

from __future__ import annotations

import pytest

from backend.tests.conftest import ASGITestClient


def test_general_intent_works_with_or_without_college_id(client: ASGITestClient) -> None:
    """General intents return conversational answers without requiring college_id."""
    no_college_resp = client.post("/api/chat", json={"question": "Hello"})
    assert no_college_resp.status_code == 200
    data = no_college_resp.json()
    assert data["intent"] == "greeting"
    assert data["college_specific"] is False
    assert data["response_type"] == "general"
    assert data["verification_status"] == "GENERAL"
    assert data["college_id"] is None
    assert len(data["answer"]) > 0

    with_college_resp = client.post(
        "/api/chat",
        json={"question": "Hello", "college_id": "college_002"},
    )
    assert with_college_resp.status_code == 200
    with_data = with_college_resp.json()
    assert with_data["response_type"] == "general"
    assert with_data["college_id"] == "college_002"
    assert with_data["college_name"] == "SRM University-AP"


@pytest.mark.parametrize(
    ("college_id", "expected_name", "question", "expected_intent", "expected_snippet", "expected_domain"),
    [
        (
            "college_001",
            "NRI University",
            "Where is the college campus located?",
            "college_location",
            "Agiripalli",
            "rvrnriuniversity.edu.in",
        ),
        (
            "college_001",
            "NRI University",
            "How can I apply for admission?",
            "admissions",
            "NRIUCET",
            "rvrnriuniversity.edu.in",
        ),
        (
            "college_002",
            "SRM University-AP",
            "Where is the college campus located?",
            "college_location",
            "Neerukonda",
            "srmap.edu.in",
        ),
        (
            "college_002",
            "SRM University-AP",
            "What are the hostel facilities like?",
            "hostel",
            "SRM University-AP",
            "srmap.edu.in",
        ),
        (
            "college_003",
            "KL Deemed to be University",
            "Where is the college campus located?",
            "college_location",
            "Vaddeswaram",
            "kluniversity.in",
        ),
        (
            "college_003",
            "KL Deemed to be University",
            "What are the placement statistics and top recruiters?",
            "placements",
            "KL University",
            "kluniversity.in",
        ),
        (
            "college_004",
            "Siddhartha Academy of Higher Education",
            "What courses and degrees are offered?",
            "courses",
            "SAHE",
            "siddhartha.edu.in",
        ),
        (
            "college_004",
            "Siddhartha Academy of Higher Education",
            "What are the hostel facilities like?",
            "hostel",
            "SAHE",
            "siddhartha.edu.in",
        ),
        (
            "college_005",
            "Prasad V Potluri Siddhartha Institute of Technology",
            "What are the tuition fees for BTech?",
            "fees",
            "PVPSIT",
            "pvpsiddhartha.ac.in",
        ),
        (
            "college_005",
            "Prasad V Potluri Siddhartha Institute of Technology",
            "What are the placement statistics and top recruiters?",
            "placements",
            "Ramesh Babu",
            "pvpsiddhartha.ac.in",
        ),
    ],
)
def test_verified_faqs_returned_with_sources_for_all_five_colleges(
    client: ASGITestClient,
    college_id: str,
    expected_name: str,
    question: str,
    expected_intent: str,
    expected_snippet: str,
    expected_domain: str,
) -> None:
    """Verified college-specific FAQs across all 5 colleges return sourced factual answers."""
    resp = client.post(
        "/api/chat",
        json={"question": question, "college_id": college_id},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == expected_intent
    assert payload["college_specific"] is True
    assert payload["response_type"] == "verified_faq"
    assert payload["verification_status"] == "VERIFIED"
    assert payload["college_id"] == college_id
    assert payload["college_name"] == expected_name
    assert expected_snippet in payload["answer"]
    assert payload["source"] is not None
    assert expected_domain in payload["source"]
    assert payload["last_verified"].startswith("2026-")


@pytest.mark.parametrize(
    ("college_id", "question", "expected_intent"),
    [
        ("college_001", "What are the tuition fees for BTech?", "fees"),
        ("college_001", "Are merit scholarships available?", "scholarships"),
        ("college_001", "What are the placement statistics and top recruiters?", "placements"),
        ("college_002", "How many seats are available in BTech?", "seat_intake"),
        ("college_002", "Where can I download the semester syllabus?", "syllabus"),
        ("college_003", "Where can I download the semester syllabus?", "syllabus"),
        ("college_004", "Does the university provide internships?", "internships"),
        ("college_005", "What documents are required for admission?", "admission_documents"),
    ],
)
def test_pending_categories_return_explicit_notice(
    client: ASGITestClient,
    college_id: str,
    question: str,
    expected_intent: str,
) -> None:
    """PENDING_VERIFICATION categories return explicit notices rather than fabricated data."""
    resp = client.post(
        "/api/chat",
        json={"question": question, "college_id": college_id},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["intent"] == expected_intent
    assert payload["response_type"] == "pending_verification"
    assert payload["verification_status"] == "PENDING_VERIFICATION"
    assert payload["college_id"] == college_id
    assert "PENDING_VERIFICATION" in payload["answer"]
    assert "not yet available" in payload["answer"]


def test_strict_cross_college_isolation_and_sahe_pvpsit_separation(client: ASGITestClient) -> None:
    """Each college's responses stay strictly scoped; SAHE (004) and PVPSIT (005) never mix."""
    # Pending category in college_001 (placements) never leaks SRMAP/KLU/SAHE/PVPSIT data.
    c1_place = client.post(
        "/api/chat",
        json={"question": "What are the placement statistics and top recruiters?", "college_id": "college_001"},
    ).json()
    assert c1_place["response_type"] == "pending_verification"
    assert c1_place["verification_status"] == "PENDING_VERIFICATION"
    for leaked in ("srmap", "kluniversity", "siddhartha", "pvpsit"):
        assert leaked not in c1_place["answer"].lower()

    # Pending category in college_004 (internships) never leaks PVPSIT (college_005) internships.
    sahe_intern = client.post(
        "/api/chat",
        json={"question": "Does the university provide internships?", "college_id": "college_004"},
    ).json()
    assert sahe_intern["college_id"] == "college_004"
    assert sahe_intern["response_type"] == "pending_verification"
    assert "pvpsiddhartha" not in sahe_intern["answer"].lower()
    assert "pvpsit" not in sahe_intern["answer"].lower()

    # Verified query in college_005 (PVPSIT) never leaks SAHE URLs/details.
    pvpsit_courses = client.post(
        "/api/chat",
        json={"question": "What courses and degrees are offered?", "college_id": "college_005"},
    ).json()
    assert pvpsit_courses["college_id"] == "college_005"
    assert pvpsit_courses["response_type"] == "verified_faq"
    assert "pvpsiddhartha.ac.in" in pvpsit_courses["source"]
    assert "siddhartha.edu.in" not in pvpsit_courses["source"]
    assert "sahe" not in pvpsit_courses["answer"].lower()

    # Verified query in college_004 (SAHE) never leaks PVPSIT URLs/details.
    sahe_courses = client.post(
        "/api/chat",
        json={"question": "What courses and degrees are offered?", "college_id": "college_004"},
    ).json()
    assert sahe_courses["college_id"] == "college_004"
    assert sahe_courses["response_type"] == "verified_faq"
    assert "siddhartha.edu.in" in sahe_courses["source"]
    assert "pvpsiddhartha.ac.in" not in sahe_courses["source"]
    assert "pvpsit" not in sahe_courses["answer"].lower()


def test_missing_college_id_for_college_specific_query_returns_400(client: ASGITestClient) -> None:
    """Omitting or blanking college_id for a college-specific intent returns HTTP 400."""
    for missing_value in (None, "   "):
        resp = client.post(
            "/api/chat",
            json={"question": "What are the tuition fees?", "college_id": missing_value},
        )
        assert resp.status_code == 400
        err = resp.json()
        assert err["error_code"] == "MISSING_COLLEGE_ID"


def test_invalid_college_id_returns_404(client: ASGITestClient) -> None:
    """Invalid college_ids are rejected with HTTP 404 across college and general intents."""
    college_query = client.post(
        "/api/chat",
        json={"question": "Where is the college located?", "college_id": "invalid_college"},
    )
    assert college_query.status_code == 404
    assert college_query.json()["error_code"] == "INVALID_COLLEGE_ID"

    general_with_bad_college = client.post(
        "/api/chat",
        json={"question": "Hello", "college_id": "invalid_college"},
    )
    assert general_with_bad_college.status_code == 404
    assert general_with_bad_college.json()["error_code"] == "INVALID_COLLEGE_ID"


def test_empty_and_unknown_questions_handled_cleanly(client: ASGITestClient) -> None:
    """Blank questions return 400 EMPTY_QUESTION and low-confidence inputs return unknown guidance."""
    empty_resp = client.post(
        "/api/chat",
        json={"question": "   ", "college_id": "college_001"},
    )
    assert empty_resp.status_code == 400
    assert empty_resp.json()["error_code"] == "EMPTY_QUESTION"

    unknown_resp = client.post(
        "/api/chat",
        json={"question": "asdfghjkl qwertzuiop 11223344", "college_id": "college_001"},
    )
    assert unknown_resp.status_code == 200
    u_data = unknown_resp.json()
    assert u_data["is_unknown"] is True
    assert u_data["intent"] == "unknown"
    assert u_data["response_type"] == "unknown"
    assert u_data["verification_status"] == "NOT_APPLICABLE"
    assert u_data["college_id"] == "college_001"


def test_college_location_variations_across_all_five_colleges(
    client: ASGITestClient,
) -> None:
    """All 5 colleges resolve location queries accurately with strict isolation."""
    college_cases = [
        (
            "college_001",
            "NRI University",
            ("Agiripalli", "Pothavarappadu", "Vijayawada"),
            "rvrnriuniversity.edu.in",
        ),
        (
            "college_002",
            "SRM University-AP",
            ("Neerukonda",),
            "srmap.edu.in",
        ),
        (
            "college_003",
            "KL Deemed to be University",
            ("Vaddeswaram",),
            "kluniversity.in",
        ),
        (
            "college_004",
            "Siddhartha Academy of Higher Education",
            ("Kanuru",),
            "siddhartha.edu.in",
        ),
        (
            "college_005",
            "Prasad V Potluri Siddhartha Institute of Technology",
            ("Kanuru", "Devabhaktuni"),
            "pvpsiddhartha.ac.in",
        ),
    ]

    for college_id, college_name, expected_snippets, expected_domain in college_cases:
        queries = [
            f"Campus location of {college_name}.",
            "Where is the campus located?",
            "Tell me the college address.",
        ]
        for query in queries:
            resp = client.post(
                "/api/chat",
                json={"question": query, "college_id": college_id},
            )
            assert resp.status_code == 200, f"Failed for {college_id} query={query!r}: {resp.text}"
            data = resp.json()
            assert data["intent"] == "college_location", f"{college_id} {query!r}: {data}"
            assert data["is_unknown"] is False
            assert data["response_type"] == "verified_faq"
            assert data["college_id"] == college_id
            assert data["confidence"] >= 0.25
            assert any(snippet in data["answer"] for snippet in expected_snippets), (
                f"Expected one of {expected_snippets} in answer for {college_id}: {data['answer']}"
            )
            assert data["source"] is not None
            assert expected_domain in data["source"], (
                f"Expected domain {expected_domain} in source for {college_id}: {data['source']}"
            )


def test_college_specific_queries_stay_isolated_and_preserve_pending(
    client: ASGITestClient,
) -> None:
    """Selected college_id enforces strict data isolation and PENDING_VERIFICATION safeguards."""
    # Mismatch in text must still stay isolated to selected college_id (no cross-college leak)
    resp_004 = client.post(
        "/api/chat",
        json={
            "question": "Where is SRM University-AP located?",
            "college_id": "college_004",
        },
    )
    assert resp_004.status_code == 200
    d_004 = resp_004.json()
    assert d_004["intent"] == "college_location"
    assert d_004["college_id"] == "college_004"
    assert "Kanuru" in d_004["answer"]
    assert "Neerukonda" not in d_004["answer"]

    # Verified vs pending safeguard remains intact for college_001 library/mess_and_bus_timetable
    pending_resp = client.post(
        "/api/chat",
        json={
            "question": "What is the morning bus route timetable?",
            "college_id": "college_001",
        },
    )
    assert pending_resp.status_code == 200
    p_data = pending_resp.json()
    assert p_data["intent"] == "mess_and_bus_timetable"
    assert p_data["college_id"] == "college_001"
    assert p_data["response_type"] == "pending_verification"
