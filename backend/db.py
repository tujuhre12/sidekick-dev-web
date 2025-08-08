"""Database setup: SQLAlchemy engine, session, and base class."""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Generator
import os
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse


def _normalize_database_url(raw_url: str) -> str:
    """Normalize database URL for SQLAlchemy.

    - Defaults to local SQLite if no URL provided
    - Upgrades "postgres://" or "postgresql://" to "postgresql+psycopg://"
    - Ensures sslmode=require for Postgres if not specified (Render best practice)
    """
    if not raw_url:
        return "sqlite:///./data/app.db"

    url = raw_url.strip()

    # Normalize postgres scheme and specify psycopg (v3) driver explicitly
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    # Add sslmode=require if using Postgres and it's not already provided
    if url.startswith("postgresql+psycopg://"):
        parsed = urlparse(url)
        query_items = dict(parse_qsl(parsed.query))
        if "sslmode" not in query_items:
            query_items["sslmode"] = "require"
            new_query = urlencode(query_items)
            url = urlunparse(
                (
                    parsed.scheme,
                    parsed.netloc,
                    parsed.path,
                    parsed.params,
                    new_query,
                    parsed.fragment,
                )
            )

    return url


# Default to a local SQLite database inside the repository under backend/data
DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL"))

# For SQLite we need check_same_thread=False for multi-threaded FastAPI
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db() -> None:
    """Create database tables if they do not exist."""
    # Ensure parent directory exists for SQLite files
    if DATABASE_URL.startswith("sqlite"):
        os.makedirs("./data", exist_ok=True)

    import db_models  # noqa: F401 - ensure models are imported
    Base.metadata.create_all(bind=engine)

    # Run code-driven migrations
    try:
        from migrations import run_all_migrations

        run_all_migrations(engine)
    except Exception as e:
        # Do not prevent app startup if migrations fail; log and continue
        # In production you may want to fail fast instead.
        print(f"[DB] Migration step failed: {e}")


def get_db() -> Generator:
    """Yield a database session for request scope."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ensure Postgres sessions use Pacific Time for display and NOW()
if DATABASE_URL.startswith("postgresql"):
    @event.listens_for(engine, "connect")
    def set_postgres_timezone(dbapi_connection, connection_record):  # type: ignore[no-redef]
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("SET TIME ZONE 'America/Los_Angeles'")
            cursor.close()
        except Exception:
            # Non-fatal: continue with default timezone if this fails
            pass

