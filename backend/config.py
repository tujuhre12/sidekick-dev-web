"""Configuration settings for the Sidekick Code backend."""

import os
from typing import Dict

# Agent configuration mapping
AGENT_CONFIG: Dict[str, Dict[str, str]] = {
    "claude": {
        "filename": "claude.md",
        "name": "Claude Code"
    },
    "cursor": {
        "filename": "project_general.md", 
        "name": "Cursor"
    },
    "windsurf": {
        "filename": "windsurf.md",
        "name": "Windsurf"
    },
    "gemini": {
        "filename": "gemini.md",
        "name": "Gemini"
    },
    "cline": {
        "filename": "cline.md",
        "name": "Cline"
    },
    "bolt": {
        "filename": "bolt.md",
        "name": "Bolt"
    },
    "vscode": {
        "filename": "vscode.md",
        "name": "VS Code Copilot"
    },
    "intellij": {
        "filename": "intellij.md",
        "name": "IntelliJ IDEA"
    },
    "lovable": {
        "filename": "lovable.md",
        "name": "Lovable"
    }
}

# Universal prompt template for DeepWiki
UNIVERSAL_PROMPT_TEMPLATE = """
Please analyze this GitHub repository and create a comprehensive markdown context file for coding agents. 

The context file should include the following sections:

# Project Overview
- Brief description of what this project does
- Main goals and use cases
- Target audience

# Architecture & Structure
- High-level architecture overview
- Key directories and their purposes
- Main components and how they interact
- Data flow and system design

# Development Setup
- Prerequisites and dependencies
- Installation steps
- Environment configuration
- How to run the project locally

# Code Organization
- Coding standards and conventions
- File naming patterns
- Import/export patterns
- Component structure (if applicable)

# Key Features & Implementation
- Main features and how they're implemented
- Important algorithms or business logic
- API endpoints (if applicable)
- Database schema (if applicable)

# Testing Strategy
- Testing frameworks used
- Test file organization
- How to run tests
- Testing best practices in this codebase

# Build & Deployment
- Build process and scripts
- Deployment configuration
- Environment-specific settings
- CI/CD pipeline (if exists)

# Git Workflow
- Branching strategy
- Commit message conventions
- Code review process
- Release process

# Common Patterns & Best Practices
- Recurring code patterns
- Error handling approach
- Logging and monitoring
- Performance considerations

# Dependencies & Tools
- Key dependencies and their purposes
- Development tools and utilities
- Package management approach

# Security Considerations
- Authentication and authorization
- Data validation patterns
- Security best practices followed

# Troubleshooting & FAQ
- Common issues and solutions
- Debugging approaches
- Performance optimization tips

Please provide specific, actionable information that would help a coding agent understand and work effectively with this codebase.
"""

# Footer template
FOOTER_TEMPLATE = """

---
Generated using [Sidekick Code](https://github.com/saharmor/sidekick-code-web), your coding agent sidekick.
"""

# Environment variables
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:8081").split(",")
DEBUG = os.getenv("DEBUG", "true").lower() == "true"