"""Pydantic schemas for DB-backed resources."""

from pydantic import BaseModel
from typing import List, Optional


class UserQueryCreate(BaseModel):
    github_url: str
    selected_agents: List[str]
    session_id: Optional[str] = None
    client_info: Optional[str] = None


class UserQueryRead(BaseModel):
    id: int
    github_url: str
    selected_agents: List[str]

    class Config:
        from_attributes = True


