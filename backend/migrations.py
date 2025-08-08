"""Lightweight, code-driven migrations.

This module provides a minimal migration runner that executes on app startup.
It handles normalizing existing data and updating types where supported.

Current migrations:
 - 2025-08-08-error-event-enum: normalize `error_events.event_type` values and
   migrate to an enum in Postgres.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy.engine import Engine
from sqlalchemy import text


MIGRATION_NAME = "2025-08-08-error-event-enum"


def _ensure_schema_migrations_table(engine: Engine) -> None:
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if dialect == "postgresql":
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                        name TEXT PRIMARY KEY,
                        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
            )
        else:
            # SQLite and others
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                        name TEXT PRIMARY KEY,
                        applied_at TEXT NOT NULL
                    )
                    """
                )
            )


def _is_applied(engine: Engine, name: str) -> bool:
    with engine.begin() as conn:
        result = conn.execute(text("SELECT 1 FROM schema_migrations WHERE name = :name"), {"name": name}).first()
        return result is not None


def _mark_applied(engine: Engine, name: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO schema_migrations (name, applied_at) VALUES (:name, :applied_at)"),
            {"name": name, "applied_at": datetime.utcnow().isoformat()},
        )


def _normalize_error_event_values(engine: Engine) -> None:
    """Normalize existing `error_events.event_type` values to the new enum labels."""
    with engine.begin() as conn:
        # Map various historical strings to canonical values
        statements = [
            # Private repository variants
            ("UPDATE error_events SET event_type = 'private_repository' WHERE event_type IN (:a, :b)",
             {"a": "Private repository", "b": "Private Repository"}),
            # Repository not indexed variants (typos, capitalization)
            ("UPDATE error_events SET event_type = 'repository_not_indexed' WHERE event_type IN (:a, :b, :c, :d)",
             {"a": "Repository not index", "b": "Repository not indexed", "c": "repository_not_indexed", "d": "Repository Not Indexed"}),
        ]
        for sql, params in statements:
            conn.execute(text(sql), params)

        # Fallback: any non-canonical values become repository_not_indexed
        conn.execute(
            text(
                """
                UPDATE error_events
                SET event_type = 'repository_not_indexed'
                WHERE event_type NOT IN ('repository_not_indexed', 'private_repository')
                """
            )
        )


def _migrate_postgres_enum(engine: Engine) -> None:
    """Create enum type and alter column in Postgres."""
    with engine.begin() as conn:
        # Create type if it doesn't exist
        type_exists = conn.execute(
            text("SELECT 1 FROM pg_type WHERE typname = 'error_event_type'")
        ).first() is not None
        if not type_exists:
            conn.execute(text("CREATE TYPE error_event_type AS ENUM ('repository_not_indexed', 'private_repository')"))

        # Ensure data is normalized before altering type
        _normalize_error_event_values(engine)

        # Alter column to use enum type
        conn.execute(
            text(
                """
                ALTER TABLE error_events
                ALTER COLUMN event_type TYPE error_event_type USING event_type::error_event_type
                """
            )
        )


def _migrate_sqlite(engine: Engine) -> None:
    """SQLite: only normalize data. Changing column type/add CHECK retroactively is non-trivial."""
    _normalize_error_event_values(engine)


def run_all_migrations(engine: Engine) -> None:
    """Run all pending migrations idempotently."""
    _ensure_schema_migrations_table(engine)

    if not _is_applied(engine, MIGRATION_NAME):
        dialect = engine.dialect.name
        if dialect == "postgresql":
            _migrate_postgres_enum(engine)
        else:
            _migrate_sqlite(engine)

        _mark_applied(engine, MIGRATION_NAME)


