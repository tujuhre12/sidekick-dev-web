"""Configuration settings for the Sidekick Dev backend."""

import os
from typing import Dict

# Repository URL - centralized location for all references
REPO_URL = "https://github.com/saharmor/sidekick-dev-web"

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

# Development Partnership and How We Should Partner

We build production code together. I handle implementation details while you guide architecture and catch complexity early.

## Core Workflow: Research → Plan → Implement → Validate

**Start every feature with:** "Let me research the codebase and create a plan before implementing."

1. **Research** - Understand existing patterns and architecture
2. **Plan** - Propose approach and verify with you
3. **Implement** - Build with tests and error handling
4. **Validate** - ALWAYS run formatters, linters, and tests after implementation

## Code Organization

**Keep functions small and focused:**
- If you need comments to explain sections, split into functions
- Group related functionality into clear packages
- Prefer many small files over few large ones

## Architecture Principles

**This is always a feature branch:**
- Delete old code completely - no deprecation needed
- No "removed code" or "added this line" comments - just do it

**Prefer explicit over implicit:**
- Clear function names over clever abstractions
- Obvious data flow over hidden magic
- Direct dependencies over service locators

## Maximize Efficiency

**Parallel operations:** Run multiple searches, reads, and greps in single messages
**Multiple agents:** Split complex tasks - one for tests, one for implementation
**Batch similar work:** Group related file edits together

## Problem Solving

**When stuck:** Stop. The simple solution is usually correct.

**When uncertain:** "Let me ultrathink about this architecture."

**When choosing:** "I see approach A (simple) vs B (flexible). Which do you prefer?"

Your redirects prevent over-engineering. When uncertain about implementation, stop and ask for guidance.

## Testing Strategy

**Match testing approach to code complexity:**
- Complex business logic: Write tests first (TDD)
- Simple CRUD operations: Write code first, then tests
- Hot paths: Add benchmarks after implementation

**Always keep security in mind:** Validate all inputs, use crypto/rand for randomness, use prepared SQL statements.

**Performance rule:** Measure before optimizing. No guessing.

## Progress Tracking

- **Use Todo lists** for task management
- **Clear naming** in all code

Focus on maintainable solutions over clever abstractions.

---
Generated using [Sidekick Dev]({REPO_URL}), your coding agent sidekick.
"""

# Environment variables
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:8081,http://localhost:8080,https://saharmor.github.io,https://sidekickdev.com").split(",")
DEBUG = os.getenv("DEBUG", "true").lower() == "true"