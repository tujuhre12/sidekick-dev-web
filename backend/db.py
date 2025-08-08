"""Database setup: SQLAlchemy engine, session, and base class."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Generator
import os

# Default to a local SQLite database inside the repository under backend/data
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")

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


def get_db() -> Generator:
    """Yield a database session for request scope."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


