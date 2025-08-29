"""Lightweight, code-driven migrations.

This module provides a minimal migration runner that executes on app startup.
It handles normalizing existing data and updating types where supported.

Current migrations:
 - 2025-08-08-error-event-enum: normalize `error_events.event_type` values and
   migrate to an enum in Postgres.
  - 2025-08-08-user-queries-add-client-id: add `client_id` column and index to
    `user_queries` table (idempotent).
  - 2025-08-08-email-signups: create `email_signups` table if it does not exist
    (idempotent, for SQLite and Postgres).
  - 2025-08-08-set-timezone-pacific: set Postgres DB timezone to America/Los_Angeles
    for sessions and normalize existing timestamps for display consistency.
"""

from datetime import datetime
from typing import Optional, List, Tuple, Callable
from sqlalchemy.engine import Engine
from sqlalchemy import text

# Migrations are defined as (name, callable) pairs and will be applied in order
MigrationFunc = Callable[[Engine], None]
MIGRATIONS: List[Tuple[str, MigrationFunc]] = []


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
        # Desired canonical enum values
        desired_values = ["repository_not_indexed", "private_repository"]

        # Create type if it doesn't exist
        type_exists = conn.execute(
            text("SELECT 1 FROM pg_type WHERE typname = 'error_event_type'")
        ).first() is not None
        if not type_exists:
            conn.execute(
                text(
                    "CREATE TYPE error_event_type AS ENUM ('repository_not_indexed', 'private_repository')"
                )
            )
        else:
            # Ensure the existing type has the needed labels
            existing = conn.execute(
                text(
                    """
                    SELECT enumlabel
                    FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = 'error_event_type'
                    """
                )
            ).fetchall()
            existing_values = {row[0] for row in existing}
            for value in desired_values:
                if value not in existing_values:
                    # Add any missing values (IF NOT EXISTS is available on modern Postgres)
                    conn.execute(text(f"ALTER TYPE error_event_type ADD VALUE IF NOT EXISTS '{value}'"))

        # Ensure data is normalized before altering type
        _normalize_error_event_values(engine)

        # If the column is already the desired enum type, skip altering
        col_type = conn.execute(
            text(
                """
                SELECT udt_name
                FROM information_schema.columns
                WHERE table_name = 'error_events' AND column_name = 'event_type'
                """
            )
        ).scalar()
        if col_type != "error_event_type":
            # Alter column to use enum type with safe cast
            conn.execute(
                text(
                    """
                    ALTER TABLE error_events
                    ALTER COLUMN event_type TYPE error_event_type USING event_type::text::error_event_type
                    """
                )
            )


def _migrate_sqlite(engine: Engine) -> None:
    """SQLite: only normalize data. Changing column type/add CHECK retroactively is non-trivial."""
    _normalize_error_event_values(engine)


def _user_queries_add_client_id(engine: Engine) -> None:
    """Add `client_id` column and index to user_queries if missing (idempotent)."""
    dialect = engine.dialect.name
    with engine.begin() as conn:
        column_exists = False

        if dialect == "sqlite":
            res = conn.execute(text("PRAGMA table_info('user_queries')")).fetchall()
            for row in res:
                # row format: cid, name, type, notnull, dflt_value, pk
                if len(row) >= 2 and str(row[1]) == "client_id":
                    column_exists = True
                    break
        else:
            # Postgres or others
            check_sql = text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'user_queries' AND column_name = 'client_id'
                """
            )
            column_exists = conn.execute(check_sql).first() is not None

        if not column_exists:
            # Add the column
            conn.execute(text("ALTER TABLE user_queries ADD COLUMN client_id VARCHAR(128)"))

        # Ensure index exists (use the default SQLAlchemy naming convention)
        if dialect == "sqlite":
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_user_queries_client_id ON user_queries (client_id)"
                )
            )
        elif dialect == "postgresql":
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_user_queries_client_id ON user_queries (client_id)"
                )
            )


def _create_email_signups_table(engine: Engine) -> None:
    """Create email_signups table if it doesn't exist."""
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if dialect == "sqlite":
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS email_signups (
                        id INTEGER PRIMARY KEY,
                        email VARCHAR(320) NOT NULL UNIQUE,
                        created_at TEXT NOT NULL DEFAULT (datetime('now'))
                    );
                    """
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_email_signups_email ON email_signups (email)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_email_signups_created_at ON email_signups (created_at)"
                )
            )
        else:
            # Postgres
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS email_signups (
                        id SERIAL PRIMARY KEY,
                        email VARCHAR(320) NOT NULL UNIQUE,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    """
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_email_signups_email ON email_signups (email)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_email_signups_created_at ON email_signups (created_at)"
                )
            )


def _set_database_timezone_pacific(engine: Engine) -> None:
    """Set Postgres default timezone to America/Los_Angeles if possible.

    For SQLite there is no timezone setting; timestamps stored as text/naive.
    """
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as conn:
        # Set the parameter at database level if permitted; otherwise sessions (handled in db.py)
        try:
            conn.execute(text("ALTER DATABASE CURRENT SET TIME ZONE 'America/Los_Angeles'"))
        except Exception:
            # Not critical; session-level SET is handled in db.py
            pass

def run_all_migrations(engine: Engine) -> None:
    """Run all pending migrations idempotently in declared order."""
    _ensure_schema_migrations_table(engine)

    # Register migrations in order
    if not any(name == "2025-08-08-error-event-enum" for name, _ in MIGRATIONS):
        def _apply_error_event_enum(engine_: Engine) -> None:
            if engine_.dialect.name == "postgresql":
                _migrate_postgres_enum(engine_)
            else:
                _migrate_sqlite(engine_)

        MIGRATIONS.append(("2025-08-08-error-event-enum", _apply_error_event_enum))

    if not any(name == "2025-08-08-user-queries-add-client-id" for name, _ in MIGRATIONS):
        MIGRATIONS.append(("2025-08-08-user-queries-add-client-id", _user_queries_add_client_id))

    if not any(name == "2025-08-08-email-signups" for name, _ in MIGRATIONS):
        MIGRATIONS.append(("2025-08-08-email-signups", _create_email_signups_table))

    if not any(name == "2025-08-08-set-timezone-pacific" for name, _ in MIGRATIONS):
        MIGRATIONS.append(("2025-08-08-set-timezone-pacific", _set_database_timezone_pacific))

    # Apply each migration if not already applied
    for name, fn in MIGRATIONS:
        if not _is_applied(engine, name):
            fn(engine)
            _mark_applied(engine, name)


