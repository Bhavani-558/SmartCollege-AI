"""Prepared PostgreSQL SQLAlchemy ORM models and session management (inactive while FAQ_BACKEND=json)."""

from __future__ import annotations

from collections.abc import Generator
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for prepared PostgreSQL tables."""


class CollegeORM(Base):
    """PostgreSQL table model for registered college profiles."""

    __tablename__ = "colleges"

    college_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    college_name: Mapped[str] = mapped_column(String(255), nullable=False)
    official_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    short_code: Mapped[str] = mapped_column(String(64), nullable=False, default="PENDING_VERIFICATION")
    ugc_status: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_primary_profile: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    profile_status: Mapped[str] = mapped_column(String(64), nullable=False, default="PENDING_VERIFICATION")
    institutional_data_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    last_verified: Mapped[str] = mapped_column(String(64), nullable=False, default="PENDING_VERIFICATION")

    faqs: Mapped[list["CollegeFAQORM"]] = relationship(
        back_populates="college", cascade="all, delete-orphan"
    )


class CollegeFAQORM(Base):
    """PostgreSQL table model for college-isolated FAQ entries."""

    __tablename__ = "college_faqs"
    __table_args__ = (
        Index("ix_college_faqs_college_category", "college_id", "category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    college_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("colleges.college_id", ondelete="CASCADE"), nullable=False
    )
    college_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(512), nullable=False)
    last_verified: Mapped[str] = mapped_column(String(64), nullable=False)
    verification_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PENDING_VERIFICATION"
    )

    college: Mapped[CollegeORM] = relationship(back_populates="faqs")


class ChatQueryLogORM(Base):
    """Prepared audit log table for anonymized student query analytics."""

    __tablename__ = "chat_query_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    college_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    predicted_intent: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[str] = mapped_column(String(32), nullable=False)
    response_type: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


def create_postgres_engine(database_url: str):
    """Create a SQLAlchemy engine for PostgreSQL when database_url is configured."""
    return create_engine(database_url, pool_pre_ping=True, future=True)


def init_postgres_schema(database_url: str) -> None:
    """Create prepared PostgreSQL tables on the configured database."""
    engine = create_postgres_engine(database_url)
    Base.metadata.create_all(bind=engine)


def get_postgres_session(database_url: str) -> Generator[Session, None, None]:
    """Yield a transactional SQLAlchemy session for PostgreSQL."""
    engine = create_postgres_engine(database_url)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()

