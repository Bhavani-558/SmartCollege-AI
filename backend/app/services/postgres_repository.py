"""Prepared PostgreSQL repository using SQLAlchemy ORM models.

The initial working API runs on JsonDataStore (FAQ_BACKEND=json). When
switched to FAQ_BACKEND=postgres with a configured DATABASE_URL, this
repository queries the normalized `colleges` and `college_faqs` tables with
strict (college_id, category) isolation.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, sessionmaker

from backend.app.services.data_store import (
    IntentDataError,
    IntentMetadata,
    InvalidCollegeError,
    _rank_faqs_within_slice,
)
from backend.app.utils.database import CollegeFAQORM, CollegeORM, create_postgres_engine, init_postgres_schema


class PostgresDataStore:
    """SQLAlchemy-backed FAQ and college repository prepared for PostgreSQL."""

    def __init__(self, database_url: str, intents_path: Path | str) -> None:
        self.database_url = database_url
        self.intents_path = Path(intents_path)
        self.engine = create_postgres_engine(database_url)
        self._session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
        )
        self._intents: dict[str, IntentMetadata] = self._load_intents()

    def _load_intents(self) -> dict[str, IntentMetadata]:
        if not self.intents_path.exists():
            raise IntentDataError(f"Required intents file not found: {self.intents_path}")
        with self.intents_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)

        intents: dict[str, IntentMetadata] = {}
        for entry in payload.get("intents", []):
            intent_name = str(entry["intent"]).strip()
            intents[intent_name] = IntentMetadata(
                intent=intent_name,
                category=str(entry.get("category", intent_name)).strip(),
                college_specific=bool(entry.get("college_specific", True)),
                responses=tuple(str(r) for r in entry.get("responses", []) if str(r).strip()),
            )
        return intents

    def count_intents(self) -> int:
        """Return total number of registered student intents."""
        return len(self._intents)

    def get_intent_metadata(self, intent_name: str) -> IntentMetadata | None:
        """Return intent metadata by predicted intent name."""
        return self._intents.get(intent_name)

    def ensure_schema(self) -> None:
        """Create tables if they do not yet exist."""
        init_postgres_schema(self.database_url)

    def sync_from_json_data(
        self,
        colleges_path: Path | str,
        college_faq_path: Path | str,
    ) -> dict[str, int]:
        """Seed or refresh PostgreSQL colleges and college_faqs tables from processed JSON files."""
        self.ensure_schema()
        colleges_payload = json.loads(Path(colleges_path).read_text(encoding="utf-8"))
        faqs_payload = json.loads(Path(college_faq_path).read_text(encoding="utf-8"))

        college_count = 0
        faq_count = 0
        with Session(self.engine) as session:
            for profile in colleges_payload.get("colleges", []):
                cid = str(profile["college_id"]).strip()
                payload_blob = {
                    "location": profile.get("location"),
                    "logo_url": profile.get("logo_url"),
                    "official_sources": profile.get("official_sources", []),
                    "supported_categories": profile.get("supported_categories", []),
                    "verified_fields": profile.get("verified_fields", {}),
                    "institutional_data": profile.get("institutional_data", {}),
                }
                existing = session.get(CollegeORM, cid)
                if existing is None:
                    session.add(
                        CollegeORM(
                            college_id=cid,
                            college_name=profile["college_name"],
                            official_name=profile.get("official_name"),
                            short_code=profile.get("short_code", "PENDING_VERIFICATION"),
                            ugc_status=profile.get("ugc_status"),
                            is_primary_profile=bool(profile.get("is_primary_profile", False)),
                            profile_status=profile.get("profile_status", "PENDING_VERIFICATION"),
                            institutional_data_json=json.dumps(payload_blob),
                            last_verified=profile.get("last_verified", "PENDING_VERIFICATION"),
                        )
                    )
                else:
                    existing.college_name = profile["college_name"]
                    existing.official_name = profile.get("official_name")
                    existing.short_code = profile.get("short_code", "PENDING_VERIFICATION")
                    existing.ugc_status = profile.get("ugc_status")
                    existing.is_primary_profile = bool(profile.get("is_primary_profile", False))
                    existing.profile_status = profile.get("profile_status", "PENDING_VERIFICATION")
                    existing.institutional_data_json = json.dumps(payload_blob)
                    existing.last_verified = profile.get("last_verified", "PENDING_VERIFICATION")
                college_count += 1

            session.execute(delete(CollegeFAQORM))
            for faq in faqs_payload.get("faqs", []):
                session.add(
                    CollegeFAQORM(
                        college_id=str(faq["college_id"]).strip(),
                        college_name=faq["college_name"],
                        category=str(faq["category"]).strip(),
                        question=faq["question"],
                        answer=faq["answer"],
                        source=faq["source"],
                        last_verified=faq["last_verified"],
                        verification_status=faq["verification_status"],
                    )
                )
                faq_count += 1

            session.commit()

        return {"colleges_synced": college_count, "faqs_synced": faq_count}

    def college_exists(self, college_id: str) -> bool:
        """Return True iff college_id exists in the colleges table."""
        with self._session_factory() as session:
            stmt = select(CollegeORM.college_id).where(CollegeORM.college_id == college_id)
            return session.execute(stmt).scalar_one_or_none() is not None

    def _faq_counts(self, session: Session, college_id: str) -> tuple[int, int]:
        verified_stmt = select(func.count(CollegeFAQORM.id)).where(
            CollegeFAQORM.college_id == college_id,
            CollegeFAQORM.verification_status == "VERIFIED",
        )
        pending_stmt = select(func.count(CollegeFAQORM.id)).where(
            CollegeFAQORM.college_id == college_id,
            CollegeFAQORM.verification_status == "PENDING_VERIFICATION",
        )
        return (
            int(session.execute(verified_stmt).scalar_one()),
            int(session.execute(pending_stmt).scalar_one()),
        )

    def _serialize_summary(self, session: Session, row: CollegeORM) -> dict[str, Any]:
        verified_count, pending_count = self._faq_counts(session, row.college_id)
        blob = json.loads(row.institutional_data_json or "{}")
        return {
            "college_id": row.college_id,
            "college_name": row.college_name,
            "official_name": row.official_name,
            "short_code": row.short_code,
            "location": blob.get("location"),
            "logo_url": blob.get("logo_url"),
            "is_primary_profile": row.is_primary_profile,
            "profile_status": row.profile_status,
            "verified_faq_count": verified_count,
            "pending_faq_count": pending_count,
            "last_verified": row.last_verified,
        }

    def get_college_summary(self, college_id: str) -> dict[str, Any]:
        """Return summary metadata for one registered college."""
        with self._session_factory() as session:
            row = session.get(CollegeORM, college_id)
            if row is None:
                raise InvalidCollegeError(college_id)
            return self._serialize_summary(session, row)

    def list_colleges(self) -> list[dict[str, Any]]:
        """List all registered colleges ordered by college_id."""
        with self._session_factory() as session:
            rows = session.execute(
                select(CollegeORM).order_by(CollegeORM.college_id)
            ).scalars().all()
            return [self._serialize_summary(session, row) for row in rows]

    def get_college_profile(self, college_id: str) -> dict[str, Any]:
        """Return full isolated profile for one college_id."""
        with self._session_factory() as session:
            row = session.get(CollegeORM, college_id)
            if row is None:
                raise InvalidCollegeError(college_id)
            blob = json.loads(row.institutional_data_json or "{}")
            return {
                "college_id": row.college_id,
                "college_name": row.college_name,
                "official_name": row.official_name,
                "short_code": row.short_code,
                "location": blob.get("location"),
                "logo_url": blob.get("logo_url"),
                "ugc_status": row.ugc_status,
                "is_primary_profile": row.is_primary_profile,
                "profile_status": row.profile_status,
                "official_sources": list(blob.get("official_sources", [])),
                "supported_categories": list(blob.get("supported_categories", [])),
                "verified_fields": dict(blob.get("verified_fields", {})),
                "institutional_data": dict(blob.get("institutional_data", {})),
                "last_verified": row.last_verified,
            }

    @staticmethod
    def _serialize_faq(row: CollegeFAQORM) -> dict[str, Any]:
        return {
            "college_id": row.college_id,
            "college_name": row.college_name,
            "category": row.category,
            "question": row.question,
            "answer": row.answer,
            "source": row.source,
            "last_verified": row.last_verified,
            "verification_status": row.verification_status,
        }

    def get_college_faqs(
        self,
        college_id: str,
        category: str | None = None,
        verification_status: str | None = None,
    ) -> list[dict[str, Any]]:
        """Return FAQs strictly filtered to college_id."""
        with self._session_factory() as session:
            if session.get(CollegeORM, college_id) is None:
                raise InvalidCollegeError(college_id)

            stmt = select(CollegeFAQORM).where(CollegeFAQORM.college_id == college_id)
            if category is not None:
                stmt = stmt.where(CollegeFAQORM.category == category)
            if verification_status is not None:
                stmt = stmt.where(CollegeFAQORM.verification_status == verification_status)

            rows = session.execute(stmt.order_by(CollegeFAQORM.id)).scalars().all()
            return [self._serialize_faq(row) for row in rows]

    def lookup_category_faqs(
        self,
        college_id: str,
        category: str,
        question: str,
    ) -> tuple[dict[str, Any] | None, list[dict[str, Any]], list[dict[str, Any]]]:
        """Retrieve and rank FAQs strictly for (college_id, category)."""
        records = self.get_college_faqs(college_id=college_id, category=category)
        verified_records = [
            item for item in records if item.get("verification_status") == "VERIFIED"
        ]
        pending_records = [
            item for item in records if item.get("verification_status") == "PENDING_VERIFICATION"
        ]
        if verified_records:
            ranked = _rank_faqs_within_slice(question, verified_records)
            return ranked[0], ranked[1:], pending_records
        return None, [], pending_records

    def get_overview_stats(self) -> dict[str, Any]:
        with self._session_factory() as session:
            total_c = session.execute(select(func.count(CollegeORM.college_id))).scalar_one()
            total_f = session.execute(select(func.count(CollegeFAQORM.id))).scalar_one()
            verified_f = session.execute(
                select(func.count(CollegeFAQORM.id)).where(CollegeFAQORM.verification_status == "VERIFIED")
            ).scalar_one()
            pending_f = session.execute(
                select(func.count(CollegeFAQORM.id)).where(CollegeFAQORM.verification_status == "PENDING_VERIFICATION")
            ).scalar_one()
            return {
                "total_colleges": int(total_c),
                "total_faqs": int(total_f),
                "verified_faqs": int(verified_f),
                "pending_faqs": int(pending_f),
                "total_queries": 0,
                "colleges": self.list_colleges(),
            }

    def list_admin_faqs(self, **kwargs: Any) -> list[dict[str, Any]]:
        return []

    def get_faq_by_id(self, faq_id: int | str) -> dict[str, Any]:
        return {}

    def create_faq(self, **kwargs: Any) -> dict[str, Any]:
        return {}

    def update_faq(self, **kwargs: Any) -> dict[str, Any]:
        return {}

    def update_faq_verification(self, **kwargs: Any) -> dict[str, Any]:
        return {}

    def delete_faq(self, faq_id: int | str) -> dict[str, Any]:
        return {}

    def create_college(self, college_data: dict[str, Any]) -> dict[str, Any]:
        return {}

    def update_college(self, college_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        return {}

    def delete_college(self, college_id: str) -> dict[str, Any]:
        return {}

    def save_feedback(self, data: dict[str, Any]) -> tuple[dict[str, Any], bool]:
        return {}, False

    def list_feedback(self, **kwargs: Any) -> tuple[list[dict[str, Any]], int]:
        return [], 0

    def get_feedback_stats(self, **kwargs: Any) -> dict[str, Any]:
        return {
            "total_count": 0,
            "positive_count": 0,
            "negative_count": 0,
            "positive_percentage": 0.0,
            "by_college": {},
            "by_reason": {},
            "by_status": {},
        }

    def update_feedback(self, feedback_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        return {}

    def get_feedback_by_id(self, feedback_id: str) -> dict[str, Any] | None:
        return None



