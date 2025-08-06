# Sidekick Code Backend

FastAPI backend for Sidekick Code - automatically generate high-quality markdown context files for coding agents.

## Features

- 🤖 **Multi-Agent Support**: Generate context files for Claude Code, Cursor, Windsurf, and Gemini
- 🔗 **DeepWiki Integration**: Uses DeepWiki's MCP interface for repository analysis
- 📦 **Smart Packaging**: Single file download or ZIP archive for multiple files
- 🚀 **Fast & Reliable**: Persistent MCP sessions for optimal performance
- 🔒 **Input Validation**: Robust validation for GitHub URLs and agent selection

## Quick Start

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration as needed
# DEBUG=true for development, false for production
# CORS_ORIGINS=comma-separated list of allowed origins
```

### Running the Server

```bash
# Development mode (with auto-reload)
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at `http://localhost:8000`

## API Endpoints

### POST /api/generate

Generate context files for a GitHub repository.

**Request Body:**
```json
{
  "github_url": "https://github.com/owner/repo",
  "selected_agents": ["claude", "cursor", "windsurf", "gemini"]
}
```

**Response:**
- Single file: Returns markdown file directly
- Multiple files: Returns ZIP archive

**Supported Agents:**
- `claude` → `claude.md`
- `cursor` → `project_general.md`
- `windsurf` → `windsurf.md`
- `gemini` → `gemini.md`

### GET /health

Health check endpoint for monitoring.

## Architecture

```
backend/
├── main.py              # FastAPI application and routes
├── models.py            # Pydantic models for validation
├── services.py          # Business logic and file generation
├── deepwiki_client.py   # DeepWiki MCP client implementation
├── config.py            # Configuration and constants
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
└── README.md           # This file
```

## Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Invalid GitHub URL or agent selection
- **500 Internal Server Error**: DeepWiki connection issues or processing errors
- **Timeout**: DeepWiki query timeouts are handled gracefully

## Development

### Adding New Agents

1. Add agent configuration to `config.py`:
```python
AGENT_CONFIG["new_agent"] = {
    "filename": "new_agent.md",
    "name": "New Agent Name"
}
```

2. Update frontend agent list to include the new agent

3. Optionally customize content in `services.py`:
```python
def customize_markdown_for_agent(markdown: str, agent: str) -> str:
    if agent == "new_agent":
        # Apply specific formatting
        pass
    return markdown
```

### Testing

```bash
# Test the API manually
curl -X POST "http://localhost:8000/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/octocat/Hello-World",
    "selected_agents": ["claude"]
  }'
```

## Deployment

### Render (Recommended)

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Use the following build command:
```bash
pip install -r backend/requirements.txt
```
4. Use the following start command:
```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Troubleshooting

### Common Issues

1. **DeepWiki Connection Errors**
   - Check network connectivity
   - Verify DeepWiki service status
   - Check session initialization logs

2. **CORS Issues**
   - Update `CORS_ORIGINS` in environment variables
   - Ensure frontend URL is included in allowed origins

3. **File Generation Failures**
   - Verify GitHub URL format
   - Check DeepWiki response in logs
   - Ensure repository is publicly accessible

### Logs

Enable debug logging by setting `DEBUG=true` in your environment:

```bash
export DEBUG=true
python main.py
```

This will provide detailed logging for debugging issues.