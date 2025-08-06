"""Pydantic models for request/response validation."""

from pydantic import BaseModel, HttpUrl, validator
from typing import List
import re

class GenerateRequest(BaseModel):
    """Request model for the generate endpoint."""
    github_url: str
    selected_agents: List[str]
    
    @validator('github_url')
    def validate_github_url(cls, v):
        """Validate that the URL is a GitHub repository URL."""
        if not v:
            raise ValueError('GitHub URL is required')
        
        # Basic GitHub URL validation
        github_pattern = r'^https?://github\.com/[^/]+/[^/]+/?$'
        if not re.match(github_pattern, v.strip()):
            raise ValueError('Invalid GitHub repository URL format')
        
        return v.strip()
    
    @validator('selected_agents')
    def validate_selected_agents(cls, v):
        """Validate that at least one agent is selected and all agents are valid."""
        if not v:
            raise ValueError('At least one agent must be selected')
        
        valid_agents = {'claude', 'cursor', 'windsurf', 'gemini'}
        invalid_agents = set(v) - valid_agents
        if invalid_agents:
            raise ValueError(f'Invalid agents: {", ".join(invalid_agents)}')
        
        return v

class GenerateResponse(BaseModel):
    """Response model for successful generation."""
    success: bool
    message: str
    download_url: str = None
    files_generated: List[str] = []
    view_search_url: str = None
    file_content: str = None
    filename: str = None
    is_zip: bool = False

class ErrorResponse(BaseModel):
    """Response model for errors."""
    success: bool = False
    error: str
    details: str = None