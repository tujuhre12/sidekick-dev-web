"""SQLAlchemy ORM models."""

from enum import Enum as PyEnum
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db import Base


class UserQuery(Base):
    __tablename__ = "user_queries"

    id = Column(Integer, primary_key=True, index=True)
    # The full GitHub repo URL the user requested
    github_url = Column(String(512), nullable=False, index=True)
    # Comma-separated list of selected agents (e.g., "claude,cursor")
    agents_csv = Column(String(256), nullable=False)
    # Optional: frontend session identifier or user identifier if available later
    session_id = Column(String(128), nullable=True, index=True)
    # Optional: GA client id
    client_id = Column(String(128), nullable=True, index=True)
    # Optional: originating IP or user agent for analytics (left nullable)
    client_info = Column(Text, nullable=True)
    # When the query was created
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    error_events = relationship(
        "ErrorEvent",
        back_populates="user_query",
        cascade="all, delete-orphan",
    )


class ErrorEvent(Base):
    __tablename__ = "error_events"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    class ErrorEventType(str, PyEnum):
        REPOSITORY_NOT_INDEXED = "repository_not_indexed"
        PRIVATE_REPOSITORY = "private_repository"

    event_type = Column(
        SAEnum(
            ErrorEventType,  # type: ignore[name-defined]
            name="error_event_type",
            native_enum=True,
        ),
        nullable=False,
        index=True,
    )
    repository_url = Column(String(512), nullable=False)
    user_query_id = Column(Integer, ForeignKey("user_queries.id", ondelete="CASCADE"), nullable=False, index=True)

    user_query = relationship("UserQuery", back_populates="error_events")


