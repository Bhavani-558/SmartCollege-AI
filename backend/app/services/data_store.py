"""JSON FAQ data store, college registry, intent metadata loader, and FAQ ranking."""

from __future__ import annotations

import json
import re
import threading
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class ChatbotDomainError(Exception):
    """Base domain exception mapped cleanly to HTTP error responses."""

    def __init__(
        self,
        detail: str,
        error_code: str,
        status_code: int = 400,
        context: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.error_code = error_code
        self.status_code = status_code
        self.context = context


class EmptyQuestionError(ChatbotDomainError):
    """Raised when the user submits a blank or whitespace-only question."""

    def __init__(self, detail: str = "Question cannot be empty or whitespace only.") -> None:
        super().__init__(
            detail=detail,
            error_code="EMPTY_QUESTION",
            status_code=400,
        )


class MissingCollegeError(ChatbotDomainError):
    """Raised when a college-specific question omits a required college_id."""

    def __init__(
        self,
        predicted_intent: str,
        detail: str | None = None,
    ) -> None:
        message = detail or (
            f"A valid college_id is required to answer college-specific queries "
            f"(predicted category: '{predicted_intent}'). Please select a college first."
        )
        super().__init__(
            detail=message,
            error_code="MISSING_COLLEGE_ID",
            status_code=400,
            context={"predicted_intent": predicted_intent},
        )


class InvalidCollegeError(ChatbotDomainError):
    """Raised when the provided college_id does not exist in the registry."""

    def __init__(self, college_id: str) -> None:
        super().__init__(
            detail=f"Unknown or invalid college_id '{college_id}'. Please select a registered college.",
            error_code="INVALID_COLLEGE_ID",
            status_code=404,
            context={"college_id": college_id},
        )


class DuplicateFAQError(ChatbotDomainError):
    """Raised when an FAQ with the same question already exists for the college."""

    def __init__(self, college_id: str, question: str) -> None:
        super().__init__(
            detail=f"An FAQ with this exact or equivalent question already exists for college '{college_id}'.",
            error_code="DUPLICATE_QUESTION",
            status_code=409,
            context={"college_id": college_id, "question": question},
        )


class DuplicateCollegeError(ChatbotDomainError):
    """Raised when attempting to create a college with an existing college_id."""

    def __init__(self, college_id: str) -> None:
        super().__init__(
            detail=f"A college with identifier '{college_id}' already exists.",
            error_code="DUPLICATE_COLLEGE_ID",
            status_code=409,
            context={"college_id": college_id},
        )


class CollegeHasFAQsError(ChatbotDomainError):
    """Raised when attempting to delete a college that still has associated FAQ records."""

    def __init__(self, college_id: str, count: int) -> None:
        super().__init__(
            detail=f"Cannot delete college '{college_id}' because it still has {count} associated FAQ records. Delete or reassign all FAQs first.",
            error_code="COLLEGE_HAS_FAQS",
            status_code=400,
            context={"college_id": college_id, "faq_count": count},
        )


class FAQNotFoundError(ChatbotDomainError):
    """Raised when an FAQ ID cannot be found."""

    def __init__(self, faq_id: int | str) -> None:
        super().__init__(
            detail=f"FAQ record with identifier '{faq_id}' was not found.",
            error_code="NOT_FOUND",
            status_code=404,
            context={"faq_id": faq_id},
        )


class FeedbackNotFoundError(ChatbotDomainError):
    """Raised when a feedback record cannot be found."""

    def __init__(self, feedback_id: str) -> None:
        super().__init__(
            detail=f"Feedback record '{feedback_id}' was not found.",
            error_code="FEEDBACK_NOT_FOUND",
            status_code=404,
            context={"feedback_id": feedback_id},
        )


class IntentDataError(ChatbotDomainError):
    """Raised when required intent metadata cannot be loaded."""

    def __init__(self, detail: str) -> None:
        super().__init__(
            detail=detail,
            error_code="INTENT_DATA_ERROR",
            status_code=500,
        )


@dataclass(frozen=True)
class IntentMetadata:
    """Metadata describing one student intent from student_intents.json."""

    intent: str
    category: str
    college_specific: bool
    responses: tuple[str, ...]


class FAQDataStoreProtocol(Protocol):
    """Repository interface implemented by both JSON and PostgreSQL stores."""

    def get_intent_metadata(self, intent_name: str) -> IntentMetadata | None: ...

    def count_intents(self) -> int: ...

    def list_colleges(self) -> list[dict[str, Any]]: ...

    def college_exists(self, college_id: str) -> bool: ...

    def get_college_profile(self, college_id: str) -> dict[str, Any]: ...

    def get_college_summary(self, college_id: str) -> dict[str, Any]: ...

    def get_college_faqs(
        self,
        college_id: str,
        category: str | None = None,
        verification_status: str | None = None,
    ) -> list[dict[str, Any]]: ...

    def lookup_category_faqs(
        self,
        college_id: str,
        category: str,
        question: str,
    ) -> tuple[dict[str, Any] | None, list[dict[str, Any]], list[dict[str, Any]]]: ...

    def get_overview_stats(self) -> dict[str, Any]: ...

    def list_admin_faqs(
        self,
        college_id: str | None = None,
        category: str | None = None,
        verification_status: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]: ...

    def get_faq_by_id(self, faq_id: int | str) -> dict[str, Any]: ...

    def create_faq(
        self,
        college_id: str,
        category: str,
        question: str,
        answer: str,
        source: str,
        last_verified: str | None = None,
        verification_status: str = "PENDING_VERIFICATION",
    ) -> dict[str, Any]: ...

    def update_faq(
        self,
        faq_id: int | str,
        college_id: str | None = None,
        category: str | None = None,
        question: str | None = None,
        answer: str | None = None,
        source: str | None = None,
        last_verified: str | None = None,
        verification_status: str | None = None,
    ) -> dict[str, Any]: ...

    def update_faq_verification(
        self,
        faq_id: int | str,
        verification_status: str,
        last_verified: str | None = None,
    ) -> dict[str, Any]: ...

    def delete_faq(self, faq_id: int | str) -> dict[str, Any]: ...

    def create_college(self, college_data: dict[str, Any]) -> dict[str, Any]: ...

    def update_college(self, college_id: str, updates: dict[str, Any]) -> dict[str, Any]: ...

    def delete_college(self, college_id: str) -> dict[str, Any]: ...

    def save_feedback(self, data: dict[str, Any]) -> tuple[dict[str, Any], bool]: ...

    def list_feedback(
        self,
        college_id: str | None = None,
        rating: str | None = None,
        status: str | None = None,
        reason: str | None = None,
        search: str | None = None,
        page: int = 1,
        limit: int = 10,
    ) -> tuple[list[dict[str, Any]], int]: ...

    def get_feedback_stats(self, college_id: str | None = None) -> dict[str, Any]: ...

    def update_feedback(self, feedback_id: str, updates: dict[str, Any]) -> dict[str, Any]: ...

    def get_feedback_by_id(self, feedback_id: str) -> dict[str, Any] | None: ...


_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> set[str]:
    """Return lowercase alphanumeric tokens for fallback similarity scoring."""
    return set(_TOKEN_RE.findall(text.lower()))


def _rank_faqs_within_slice(question: str, faqs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Rank FAQs strictly within a single (college_id, category) verified slice."""
    if len(faqs) <= 1 or not question.strip():
        return list(faqs)

    faq_texts = [f"{item['question']} {item['answer']}" for item in faqs]
    query_tokens = _tokenize(question)

    try:
        vectorizer = TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            stop_words="english",
        )
        faq_matrix = vectorizer.fit_transform(faq_texts)
        query_vector = vectorizer.transform([question])
        cosine_scores = cosine_similarity(query_vector, faq_matrix).flatten()
    except ValueError:
        cosine_scores = [0.0] * len(faqs)

    scored_items: list[tuple[float, float, float, int, dict[str, Any]]] = []
    for idx, item in enumerate(faqs):
        question_tokens = _tokenize(item["question"])
        combined_tokens = _tokenize(faq_texts[idx])
        question_overlap = (
            len(query_tokens & question_tokens) / max(len(query_tokens), 1)
            if query_tokens
            else 0.0
        )
        combined_overlap = (
            len(query_tokens & combined_tokens) / max(len(query_tokens), 1)
            if query_tokens
            else 0.0
        )
        scored_items.append(
            (
                float(cosine_scores[idx]),
                question_overlap,
                combined_overlap,
                -idx,
                item,
            )
        )

    scored_items.sort(key=lambda entry: (entry[0], entry[1], entry[2], entry[3]), reverse=True)
    return [entry[4] for entry in scored_items]


class JsonDataStore:
    """Read-only JSON-backed repository enforcing strict per-college FAQ isolation."""

    def __init__(
        self,
        intents_path: Path | str,
        colleges_path: Path | str,
        college_faq_path: Path | str,
        feedback_path: Path | str | None = None,
    ) -> None:
        self.intents_path = Path(intents_path)
        self.colleges_path = Path(colleges_path)
        self.college_faq_path = Path(college_faq_path)
        if feedback_path is None:
            self.feedback_path = Path(__file__).resolve().parents[1] / "data" / "student_feedback.json"
        else:
            self.feedback_path = Path(feedback_path)

        self._intents: dict[str, IntentMetadata] = {}
        self._colleges: dict[str, dict[str, Any]] = {}
        self._faqs_by_college: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._faqs_by_college_and_category: dict[tuple[str, str], list[dict[str, Any]]] = (
            defaultdict(list)
        )
        self._faqs_by_id: dict[int | str, dict[str, Any]] = {}
        self._feedback: list[dict[str, Any]] = []
        self._feedback_by_id: dict[str, dict[str, Any]] = {}
        self._feedback_by_session_msg: dict[tuple[str, str], dict[str, Any]] = {}
        self._lock = threading.Lock()

        self._load_all()

    def _load_json(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            raise IntentDataError(f"Required dataset file not found: {path}")
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _load_all(self) -> None:
        intents_payload = self._load_json(self.intents_path)
        for entry in intents_payload.get("intents", []):
            intent_name = str(entry["intent"]).strip()
            self._intents[intent_name] = IntentMetadata(
                intent=intent_name,
                category=str(entry.get("category", intent_name)).strip(),
                college_specific=bool(entry.get("college_specific", True)),
                responses=tuple(str(r) for r in entry.get("responses", []) if str(r).strip()),
            )

        colleges_payload = self._load_json(self.colleges_path)
        for profile in colleges_payload.get("colleges", []):
            cid = str(profile["college_id"]).strip()
            self._colleges[cid] = dict(profile)

        faq_payload = self._load_json(self.college_faq_path)
        max_id = 0
        for faq in faq_payload.get("faqs", []):
            fid = faq.get("id")
            if isinstance(fid, int) and fid > max_id:
                max_id = fid

        next_id = max_id + 1

        for idx, faq in enumerate(faq_payload.get("faqs", [])):
            cid = str(faq["college_id"]).strip()
            if cid not in self._colleges:
                continue
            category = str(faq["category"]).strip()
            record = dict(faq)
            if "id" not in record or record["id"] is None:
                record["id"] = next_id
                next_id += 1

            fid = record["id"]
            self._faqs_by_id[fid] = record
            self._faqs_by_college[cid].append(record)
            self._faqs_by_college_and_category[(cid, category)].append(record)

        self._load_feedback()

    def _load_feedback(self) -> None:
        self._feedback = []
        self._feedback_by_id = {}
        self._feedback_by_session_msg = {}
        if self.feedback_path.exists():
            try:
                with self.feedback_path.open("r", encoding="utf-8") as handle:
                    fb_payload = json.load(handle)
                for item in fb_payload.get("feedback", []):
                    fid = str(item.get("feedback_id", "")).strip()
                    if fid:
                        self._feedback_by_id[fid] = item
                        sess_key = (str(item.get("session_id", "")), str(item.get("message_id", "")))
                        self._feedback_by_session_msg[sess_key] = item
                        self._feedback.append(item)
            except Exception:
                self._feedback = []

    def count_intents(self) -> int:
        """Return total number of registered student intents."""
        return len(self._intents)

    def get_intent_metadata(self, intent_name: str) -> IntentMetadata | None:
        """Return metadata for a predicted intent name, or None if unknown."""
        return self._intents.get(intent_name)

    def college_exists(self, college_id: str) -> bool:
        """Return True iff college_id exists in the college registry."""
        return college_id in self._colleges

    def _faq_counts(self, college_id: str) -> tuple[int, int]:
        faqs = self._faqs_by_college.get(college_id, [])
        verified = sum(1 for item in faqs if item.get("verification_status") == "VERIFIED")
        pending = sum(
            1 for item in faqs if item.get("verification_status") == "PENDING_VERIFICATION"
        )
        return verified, pending

    @staticmethod
    def _extract_location(profile: dict[str, Any]) -> str | None:
        direct = profile.get("location")
        if isinstance(direct, str) and direct.strip():
            return direct.strip()
        loc = profile.get("institutional_data", {}).get("location", {})
        city = loc.get("city")
        state = loc.get("state")
        parts = [p for p in (city, state) if isinstance(p, str) and p and p != "PENDING_VERIFICATION"]
        return ", ".join(parts) if parts else None

    def get_college_summary(self, college_id: str) -> dict[str, Any]:
        """Return summary metadata and verified/pending FAQ counts for one college."""
        profile = self._colleges.get(college_id)
        if profile is None:
            raise InvalidCollegeError(college_id)

        verified_count, pending_count = self._faq_counts(college_id)
        return {
            "college_id": profile["college_id"],
            "college_name": profile["college_name"],
            "official_name": profile.get("official_name"),
            "short_code": profile.get("short_code", "PENDING_VERIFICATION"),
            "location": self._extract_location(profile),
            "logo_url": profile.get("logo_url"),
            "is_primary_profile": bool(profile.get("is_primary_profile", False)),
            "profile_status": profile.get("profile_status", "PENDING_VERIFICATION"),
            "verified_faq_count": verified_count,
            "pending_faq_count": pending_count,
            "last_verified": profile.get("last_verified", "PENDING_VERIFICATION"),
        }

    def list_colleges(self) -> list[dict[str, Any]]:
        """List summary metadata for all registered colleges."""
        return [self.get_college_summary(cid) for cid in self._colleges]

    def get_college_profile(self, college_id: str) -> dict[str, Any]:
        """Return full isolated college profile for a valid college_id."""
        profile = self._colleges.get(college_id)
        if profile is None:
            raise InvalidCollegeError(college_id)

        return {
            "college_id": profile["college_id"],
            "college_name": profile["college_name"],
            "official_name": profile.get("official_name"),
            "short_code": profile.get("short_code", "PENDING_VERIFICATION"),
            "location": self._extract_location(profile),
            "logo_url": profile.get("logo_url"),
            "ugc_status": profile.get("ugc_status"),
            "is_primary_profile": bool(profile.get("is_primary_profile", False)),
            "profile_status": profile.get("profile_status", "PENDING_VERIFICATION"),
            "official_sources": list(profile.get("official_sources", [])),
            "supported_categories": list(profile.get("supported_categories", [])),
            "verified_fields": dict(profile.get("verified_fields", {})),
            "institutional_data": dict(profile.get("institutional_data", {})),
            "last_verified": profile.get("last_verified", "PENDING_VERIFICATION"),
        }

    def get_college_faqs(
        self,
        college_id: str,
        category: str | None = None,
        verification_status: str | None = None,
    ) -> list[dict[str, Any]]:
        """Return FAQs strictly filtered to the requested college_id."""
        if college_id not in self._colleges:
            raise InvalidCollegeError(college_id)

        records = (
            list(self._faqs_by_college_and_category.get((college_id, category), []))
            if category is not None
            else list(self._faqs_by_college.get(college_id, []))
        )

        if verification_status is not None:
            records = [
                dict(item)
                for item in records
                if item.get("verification_status") == verification_status
            ]
        else:
            records = [dict(item) for item in records]

        return records

    def lookup_category_faqs(
        self,
        college_id: str,
        category: str,
        question: str,
    ) -> tuple[dict[str, Any] | None, list[dict[str, Any]], list[dict[str, Any]]]:
        """Retrieve (best_verified, other_verified, pending_records) strictly for (college_id, category)."""
        if college_id not in self._colleges:
            raise InvalidCollegeError(college_id)

        scoped_records = list(self._faqs_by_college_and_category.get((college_id, category), []))
        verified_records = [
            dict(item) for item in scoped_records if item.get("verification_status") == "VERIFIED"
        ]
        pending_records = [
            dict(item)
            for item in scoped_records
            if item.get("verification_status") == "PENDING_VERIFICATION"
        ]

        if verified_records:
            ranked = _rank_faqs_within_slice(question, verified_records)
            return ranked[0], ranked[1:], pending_records

        return None, [], pending_records

    def _check_duplicate_question(
        self,
        college_id: str,
        question: str,
        exclude_faq_id: int | str | None = None,
    ) -> None:
        """Prevent duplicate questions within the same college scope."""
        norm_q = question.strip().lower()
        college_faqs = self._faqs_by_college.get(college_id, [])
        for f in college_faqs:
            if exclude_faq_id is not None and str(f.get("id")) == str(exclude_faq_id):
                continue
            if f.get("question", "").strip().lower() == norm_q:
                raise DuplicateFAQError(college_id=college_id, question=question.strip())

    def _persist_faqs(self) -> None:
        """Atomically persist all FAQs to disk using a temporary file and replace."""
        all_records = list(self._faqs_by_id.values())
        payload = {"faqs": all_records}
        self.college_faq_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self.college_faq_path.parent / f"{self.college_faq_path.stem}_{uuid.uuid4().hex}.tmp"
        with temp_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
        for attempt in range(10):
            try:
                temp_path.replace(self.college_faq_path)
                break
            except PermissionError:
                if attempt == 9:
                    raise
                time.sleep(0.05)

    def _persist_colleges(self) -> None:
        """Atomically persist all registered colleges to disk using a temporary file and replace."""
        all_profiles = list(self._colleges.values())
        payload = {"colleges": all_profiles}
        self.colleges_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self.colleges_path.parent / f"{self.colleges_path.stem}_{uuid.uuid4().hex}.tmp"
        with temp_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
        for attempt in range(10):
            try:
                temp_path.replace(self.colleges_path)
                break
            except PermissionError:
                if attempt == 9:
                    raise
                time.sleep(0.05)

    def get_overview_stats(self) -> dict[str, Any]:
        """Return aggregate statistics across all registered colleges for the Admin Dashboard."""
        all_faqs = list(self._faqs_by_id.values())
        verified = sum(1 for item in all_faqs if item.get("verification_status") == "VERIFIED")
        pending = sum(
            1 for item in all_faqs if item.get("verification_status") == "PENDING_VERIFICATION"
        )
        return {
            "total_colleges": len(self._colleges),
            "total_faqs": len(all_faqs),
            "verified_faqs": verified,
            "pending_faqs": pending,
            "total_queries": 0,
            "colleges": self.list_colleges(),
        }

    def list_admin_faqs(
        self,
        college_id: str | None = None,
        category: str | None = None,
        verification_status: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        """List FAQs with optional college, category, verification-status filters and keyword search."""
        if college_id:
            if college_id not in self._colleges:
                raise InvalidCollegeError(college_id)
            records = list(self._faqs_by_college.get(college_id, []))
        else:
            records = list(self._faqs_by_id.values())

        if category:
            records = [r for r in records if r.get("category") == category]

        if verification_status:
            records = [r for r in records if r.get("verification_status") == verification_status]

        if search and search.strip():
            term = search.strip().lower()
            records = [
                r
                for r in records
                if term in r.get("question", "").lower()
                or term in r.get("answer", "").lower()
                or term in r.get("category", "").lower()
                or term in r.get("source", "").lower()
                or term in r.get("college_name", "").lower()
            ]

        return sorted(records, key=lambda x: str(x.get("id", "")))

    def get_faq_by_id(self, faq_id: int | str) -> dict[str, Any]:
        """Retrieve single FAQ by identifier."""
        lookup_id = int(faq_id) if str(faq_id).isdigit() else faq_id
        faq = self._faqs_by_id.get(lookup_id)
        if faq is None:
            for item in self._faqs_by_id.values():
                if str(item.get("id")) == str(faq_id):
                    return dict(item)
            raise FAQNotFoundError(faq_id)
        return dict(faq)

    def create_faq(
        self,
        college_id: str,
        category: str,
        question: str,
        answer: str,
        source: str,
        last_verified: str | None = None,
        verification_status: str = "PENDING_VERIFICATION",
    ) -> dict[str, Any]:
        """Create a new FAQ entry for a registered college."""
        with self._lock:
            if college_id not in self._colleges:
                raise InvalidCollegeError(college_id)

            self._check_duplicate_question(college_id, question)

            college_profile = self._colleges[college_id]
            college_name = college_profile["college_name"]

            int_ids = [k for k in self._faqs_by_id.keys() if isinstance(k, int)]
            assigned_id = max(int_ids, default=0) + 1

            today_str = datetime.now().strftime("%Y-%m-%d")
            record = {
                "id": assigned_id,
                "college_id": college_id,
                "college_name": college_name,
                "category": category.strip(),
                "question": question.strip(),
                "answer": answer.strip(),
                "source": source.strip(),
                "last_verified": last_verified.strip() if last_verified else today_str,
                "verification_status": verification_status,
            }

            self._faqs_by_id[assigned_id] = record
            self._faqs_by_college[college_id].append(record)
            self._faqs_by_college_and_category[(college_id, category.strip())].append(record)

            self._persist_faqs()
            return dict(record)

    def update_faq(
        self,
        faq_id: int | str,
        college_id: str | None = None,
        category: str | None = None,
        question: str | None = None,
        answer: str | None = None,
        source: str | None = None,
        last_verified: str | None = None,
        verification_status: str | None = None,
    ) -> dict[str, Any]:
        """Update an existing FAQ entry."""
        with self._lock:
            lookup_id = int(faq_id) if str(faq_id).isdigit() else faq_id
            existing = self._faqs_by_id.get(lookup_id)
            if existing is None:
                for item in self._faqs_by_id.values():
                    if str(item.get("id")) == str(faq_id):
                        existing = item
                        break
            if existing is None:
                raise FAQNotFoundError(faq_id)

            old_cid = existing["college_id"]
            old_category = existing["category"]
            target_cid = college_id if college_id is not None else old_cid

            if target_cid not in self._colleges:
                raise InvalidCollegeError(target_cid)

            check_q = question if question is not None else existing["question"]
            self._check_duplicate_question(target_cid, check_q, exclude_faq_id=existing["id"])

            target_category = category if category is not None else old_category

            if target_cid != old_cid or target_category != old_category:
                if existing in self._faqs_by_college[old_cid]:
                    self._faqs_by_college[old_cid].remove(existing)
                if existing in self._faqs_by_college_and_category[(old_cid, old_category)]:
                    self._faqs_by_college_and_category[(old_cid, old_category)].remove(existing)

            existing["college_id"] = target_cid
            existing["college_name"] = self._colleges[target_cid]["college_name"]
            existing["category"] = target_category

            if question is not None:
                existing["question"] = question.strip()
            if answer is not None:
                existing["answer"] = answer.strip()
            if source is not None:
                existing["source"] = source.strip()
            if verification_status is not None:
                existing["verification_status"] = verification_status
            if last_verified is not None:
                existing["last_verified"] = last_verified.strip()

            if target_cid != old_cid or target_category != old_category:
                self._faqs_by_college[target_cid].append(existing)
                self._faqs_by_college_and_category[(target_cid, target_category)].append(existing)

            self._persist_faqs()
            return dict(existing)

    def update_faq_verification(
        self,
        faq_id: int | str,
        verification_status: str,
        last_verified: str | None = None,
    ) -> dict[str, Any]:
        """Update only FAQ verification status."""
        with self._lock:
            lookup_id = int(faq_id) if str(faq_id).isdigit() else faq_id
            existing = self._faqs_by_id.get(lookup_id)
            if existing is None:
                for item in self._faqs_by_id.values():
                    if str(item.get("id")) == str(faq_id):
                        existing = item
                        break
            if existing is None:
                raise FAQNotFoundError(faq_id)

            existing["verification_status"] = verification_status
            if last_verified is not None:
                existing["last_verified"] = last_verified.strip()
            elif verification_status == "VERIFIED" and existing.get("last_verified") == "PENDING_VERIFICATION":
                existing["last_verified"] = datetime.now().strftime("%Y-%m-%d")

            self._persist_faqs()
            return dict(existing)

    def delete_faq(self, faq_id: int | str) -> dict[str, Any]:
        """Delete an FAQ entry."""
        with self._lock:
            lookup_id = int(faq_id) if str(faq_id).isdigit() else faq_id
            existing = self._faqs_by_id.get(lookup_id)
            if existing is None:
                for item in self._faqs_by_id.values():
                    if str(item.get("id")) == str(faq_id):
                        existing = item
                        lookup_id = item.get("id")
                        break
            if existing is None:
                raise FAQNotFoundError(faq_id)

            cid = existing["college_id"]
            cat = existing["category"]

            if lookup_id in self._faqs_by_id:
                del self._faqs_by_id[lookup_id]
            if existing in self._faqs_by_college[cid]:
                self._faqs_by_college[cid].remove(existing)
            if existing in self._faqs_by_college_and_category[(cid, cat)]:
                self._faqs_by_college_and_category[(cid, cat)].remove(existing)

            self._persist_faqs()
            return {
                "success": True,
                "message": f"FAQ '{faq_id}' deleted successfully.",
                "deleted_faq_id": faq_id,
            }

    def create_college(self, college_data: dict[str, Any]) -> dict[str, Any]:
        """Create a new college record."""
        with self._lock:
            cid = str(college_data["college_id"]).strip()
            if cid in self._colleges:
                raise DuplicateCollegeError(cid)

            record = dict(college_data)
            record["college_id"] = cid
            self._colleges[cid] = record
            self._persist_colleges()
            return self.get_college_profile(cid)

    def update_college(self, college_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        """Update an existing college record."""
        with self._lock:
            if college_id not in self._colleges:
                raise InvalidCollegeError(college_id)

            existing = self._colleges[college_id]
            for key, val in updates.items():
                if val is not None:
                    existing[key] = val

            if "college_name" in updates and updates["college_name"]:
                new_name = updates["college_name"]
                for faq in self._faqs_by_college.get(college_id, []):
                    faq["college_name"] = new_name
                self._persist_faqs()

            self._persist_colleges()
            return self.get_college_profile(college_id)

    def delete_college(self, college_id: str) -> dict[str, Any]:
        """Safely delete a college only if it has zero associated FAQs."""
        with self._lock:
            if college_id not in self._colleges:
                raise InvalidCollegeError(college_id)

            associated = self._faqs_by_college.get(college_id, [])
            if associated:
                raise CollegeHasFAQsError(college_id=college_id, count=len(associated))

            del self._colleges[college_id]
            self._persist_colleges()
            return {
                "success": True,
                "message": f"College '{college_id}' deleted successfully.",
                "deleted_college_id": college_id,
            }

    def _persist_feedback(self) -> None:
        """Atomically persist all feedback to disk using a temporary file and replace."""
        payload = {"feedback": list(self._feedback)}
        self.feedback_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self.feedback_path.parent / f"{self.feedback_path.stem}_{uuid.uuid4().hex}.tmp"
        with temp_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
        for attempt in range(10):
            try:
                temp_path.replace(self.feedback_path)
                break
            except PermissionError:
                if attempt == 9:
                    raise
                time.sleep(0.05)

    def save_feedback(self, data: dict[str, Any]) -> tuple[dict[str, Any], bool]:
        """Save student feedback on a chatbot answer. If (session_id, message_id) exists, update it."""
        with self._lock:
            cid = str(data.get("college_id", "")).strip()
            if cid and cid != "general" and cid not in self._colleges:
                raise InvalidCollegeError(cid)

            cname = data.get("college_name")
            if not cname:
                if cid in self._colleges:
                    cname = self._colleges[cid].get("college_name", cid)
                else:
                    cname = "General Support"

            session_id = str(data["session_id"]).strip()
            message_id = str(data["message_id"]).strip()
            key = (session_id, message_id)
            now_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")

            if key in self._feedback_by_session_msg:
                existing = self._feedback_by_session_msg[key]
                existing["rating"] = data["rating"]
                existing["reason"] = data.get("reason")
                existing["comment"] = data.get("comment")
                existing["updated_at"] = now_iso
                if "question" in data and data["question"]:
                    existing["question"] = data["question"]
                if "answer" in data and data["answer"]:
                    existing["answer"] = data["answer"]
                self._persist_feedback()
                return dict(existing), True
            else:
                fid = f"fb_{uuid.uuid4().hex[:12]}"
                new_record = {
                    "feedback_id": fid,
                    "session_id": session_id,
                    "message_id": message_id,
                    "college_id": cid,
                    "college_name": cname,
                    "question": data["question"],
                    "answer": data["answer"],
                    "intent": data.get("intent"),
                    "rating": data["rating"],
                    "reason": data.get("reason"),
                    "comment": data.get("comment"),
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "status": "NEW",
                    "admin_notes": None,
                }
                self._feedback_by_id[fid] = new_record
                self._feedback_by_session_msg[key] = new_record
                self._feedback.append(new_record)
                self._persist_feedback()
                return dict(new_record), False

    def list_feedback(
        self,
        college_id: str | None = None,
        rating: str | None = None,
        status: str | None = None,
        reason: str | None = None,
        search: str | None = None,
        page: int = 1,
        limit: int = 10,
    ) -> tuple[list[dict[str, Any]], int]:
        """List feedback records with optional filters, search, and pagination."""
        with self._lock:
            records = list(self._feedback)

        if college_id and college_id != "ALL":
            records = [r for r in records if r.get("college_id") == college_id]

        if rating and rating != "ALL":
            records = [r for r in records if r.get("rating") == rating]

        if status and status != "ALL":
            records = [r for r in records if r.get("status") == status]

        if reason and reason != "ALL":
            records = [r for r in records if r.get("reason") == reason]

        if search and search.strip():
            term = search.strip().lower()
            records = [
                r
                for r in records
                if term in r.get("question", "").lower()
                or term in r.get("answer", "").lower()
                or term in (r.get("comment") or "").lower()
                or term in (r.get("college_name") or "").lower()
                or term in r.get("feedback_id", "").lower()
            ]

        records.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        total = len(records)

        start = (max(page, 1) - 1) * limit
        end = start + limit
        paginated = [dict(r) for r in records[start:end]]
        return paginated, total

    def get_feedback_stats(self, college_id: str | None = None) -> dict[str, Any]:
        """Calculate aggregate feedback metrics."""
        with self._lock:
            records = list(self._feedback)

        if college_id and college_id != "ALL":
            records = [r for r in records if r.get("college_id") == college_id]

        total = len(records)
        pos = sum(1 for r in records if r.get("rating") == "thumbs_up")
        neg = sum(1 for r in records if r.get("rating") == "thumbs_down")
        pos_pct = round((pos / total * 100.0), 1) if total > 0 else 0.0

        by_college: dict[str, int] = defaultdict(int)
        by_reason: dict[str, int] = defaultdict(int)
        by_status: dict[str, int] = defaultdict(int)

        for r in records:
            by_college[r.get("college_id", "unknown")] += 1
            if r.get("reason"):
                by_reason[r["reason"]] += 1
            by_status[r.get("status", "NEW")] += 1

        return {
            "total_count": total,
            "positive_count": pos,
            "negative_count": neg,
            "positive_percentage": pos_pct,
            "by_college": dict(by_college),
            "by_reason": dict(by_reason),
            "by_status": dict(by_status),
        }

    def update_feedback(self, feedback_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        """Update review status or admin notes on a feedback entry."""
        with self._lock:
            existing = self._feedback_by_id.get(feedback_id)
            if existing is None:
                raise FeedbackNotFoundError(feedback_id)

            if "status" in updates and updates["status"] is not None:
                existing["status"] = updates["status"]
            if "admin_notes" in updates:
                existing["admin_notes"] = updates["admin_notes"]
            existing["updated_at"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")

            self._persist_feedback()
            return dict(existing)

    def get_feedback_by_id(self, feedback_id: str) -> dict[str, Any] | None:
        """Retrieve a single feedback record by ID."""
        with self._lock:
            item = self._feedback_by_id.get(feedback_id)
            return dict(item) if item else None


