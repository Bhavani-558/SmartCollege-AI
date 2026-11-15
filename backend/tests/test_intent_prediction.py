"""Unit tests for the pre-trained intent classification wrapper."""

from __future__ import annotations

import pytest

from backend.app.services.intent_classifier import (
    DEFAULT_CONFIDENCE_THRESHOLD,
    IntentClassifier,
    predict_intent,
)


def test_pretrained_model_predicts_general_intents() -> None:
    """General conversational queries map accurately to general intents."""
    greeting_pred = predict_intent("Hello")
    assert greeting_pred["is_unknown"] is False
    assert greeting_pred["intent"] == "greeting"
    assert greeting_pred["confidence"] >= DEFAULT_CONFIDENCE_THRESHOLD

    goodbye_pred = predict_intent("Thank you goodbye")
    assert goodbye_pred["is_unknown"] is False
    assert goodbye_pred["intent"] in {"goodbye", "salutation"}
    assert goodbye_pred["confidence"] >= DEFAULT_CONFIDENCE_THRESHOLD


@pytest.mark.parametrize(
    ("query", "expected_intent"),
    [
        ("What are the tuition fees per year?", "fees"),
        ("Are any merit scholarships available for students?", "scholarships"),
        ("How are campus placements and recruiting companies?", "placements"),
        ("Does the college help students find internships?", "internships"),
        ("Is hostel accommodation provided for students?", "hostel"),
        ("What is the admission process for joining?", "admissions"),
        ("Where is the college campus located?", "college_location"),
    ],
)
def test_pretrained_model_predicts_college_intents_independently(
    query: str,
    expected_intent: str,
) -> None:
    """NLP model classifies student intents including PENDING_VERIFICATION categories."""
    prediction = predict_intent(query)
    assert prediction["is_unknown"] is False
    assert prediction["intent"] == expected_intent
    assert prediction["confidence"] >= DEFAULT_CONFIDENCE_THRESHOLD
    assert len(prediction["top_candidates"]) == 3


def test_unknown_and_empty_queries_respect_confidence_threshold() -> None:
    """Empty and out-of-domain queries trigger unknown fallback via threshold."""
    empty_pred = predict_intent("   ")
    assert empty_pred["is_unknown"] is True
    assert empty_pred["intent"] == "unknown"
    assert empty_pred["reason"] == "empty_query"
    assert empty_pred["confidence"] == 0.0

    ood_pred = predict_intent("blargfrobnicator qwertyuiop 987654321")
    assert ood_pred["is_unknown"] is True
    assert ood_pred["intent"] == "unknown"
    assert ood_pred["reason"] == "below_confidence_threshold"
    assert ood_pred["confidence"] < DEFAULT_CONFIDENCE_THRESHOLD

    strict_pred = IntentClassifier(confidence_threshold=0.99).predict("What are the fees?")
    assert strict_pred["is_unknown"] is True
    assert strict_pred["intent"] == "unknown"
    assert strict_pred["candidate_intent"] == "fees"


@pytest.mark.parametrize(
    ("query", "expected_intent"),
    [
        # Short, formal, conversational, and college-name-containing college_location queries
        ("Campus location.", "college_location"),
        ("What is the campus location of NRI University?", "college_location"),
        ("Campus location of SRM University.", "college_location"),
        ("Where is SRM University-AP located?", "college_location"),
        ("Where is NRI University located?", "college_location"),
        ("Campus location of KL Deemed to be University.", "college_location"),
        ("Campus location of KL University.", "college_location"),
        ("Campus location of Siddhartha Academy of Higher Education.", "college_location"),
        (
            "Campus location of Prasad V Potluri Siddhartha Institute of Technology.",
            "college_location",
        ),
        ("Where is the campus located?", "college_location"),
        ("What is the college location?", "college_location"),
        ("Tell me the campus address.", "college_location"),
        ("Tell me the college address.", "college_location"),
        ("Where is SRM University-AP situated?", "college_location"),
        ("Where is the campus situated?", "college_location"),
        ("What is the address of this university?", "college_location"),
        ("How can I reach the campus?", "college_location"),
        ("How can I reach this college?", "college_location"),
        ("Where is the institution situated?", "college_location"),
        ("What is the location of this institution?", "college_location"),
        ("Can you tell me where the campus is?", "college_location"),
        # Key college-specific intent variations (short, conversational, and named)
        ("How can I apply for admission at SRM University-AP?", "admissions"),
        ("Tell me the admission eligibility criteria for B.Tech.", "admissions"),
        ("What degree programs are available here?", "courses"),
        ("Which engineering specializations does PVP Siddhartha offer?", "courses"),
        ("What is the annual tuition fee structure for B.Tech CSE?", "fees"),
        ("How much does it cost per year for engineering?", "fees"),
        ("Are merit scholarships available at KL University?", "scholarships"),
        ("Do they provide tuition fee waiver or financial aid?", "scholarships"),
        ("What are the placement statistics and highest package?", "placements"),
        ("Which top recruiters visit the campus for placements?", "placements"),
        ("Does the university provide summer internship opportunities?", "internships"),
        ("Are there industry internship programs for students?", "internships"),
        ("Are separate hostel facilities available for boys and girls?", "hostel"),
        ("What are the hostel room charges and accommodation details?", "hostel"),
        ("What are the central library timings and digital resources?", "library"),
        ("Does the campus have a central library with e-journals?", "library"),
        ("Does SRM University-AP provide bus transport from Vijayawada?", "facilities"),
        ("Is college bus transportation available for day scholars?", "facilities"),
        ("What is the morning bus route timetable and mess menu?", "mess_and_bus_timetable"),
        ("How can I contact the admissions office by phone or email?", "contact_info"),
        ("Give me the official helpline number and email address.", "contact_info"),
    ],
)
def test_natural_language_and_named_college_variations(
    query: str,
    expected_intent: str,
) -> None:
    """Equivalent phrasing and college names classify consistently above threshold."""
    prediction = predict_intent(query)
    assert prediction["is_unknown"] is False
    assert prediction["intent"] == expected_intent
    assert prediction["confidence"] >= DEFAULT_CONFIDENCE_THRESHOLD


@pytest.mark.parametrize(
    "query",
    [
        "What is the weather in Hyderabad today?",
        "Tell me a funny joke about cats",
        "Who won the cricket world cup?",
        "asdfghjkl qwerty",
        "",
    ],
)
def test_out_of_domain_queries_remain_unknown(query: str) -> None:
    """Out-of-domain, gibberish, and empty inputs must remain classified as unknown."""
    prediction = predict_intent(query)
    assert prediction["is_unknown"] is True
    assert prediction["intent"] == "unknown"

