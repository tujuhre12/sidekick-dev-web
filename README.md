# Sidekick Code

Automatically generate high-quality markdown context files for AI coding agents like Claude, Cursor, Windsurf, and Gemini by analyzing any public GitHub repository.

## Features

- **Multi-Agent Support**: Generate context files optimized for Claude, Cursor, Windsurf, and Gemini
- **GitHub Integration**: Analyze any public GitHub repository using DeepWiki's AI-powered analysis
- **Smart Packaging**: Download single markdown files or ZIP archives for multiple agents
- **Real-time Progress**: Visual progress tracking with detailed generation steps
- **Error Handling**: Clear feedback for private repositories and indexing issues
- **Modern UI**: Responsive React interface with Tailwind CSS styling

## Quick Start

### One-Command Setup

```bash
# Clone and start both frontend and backend
git clone https://github.com/saharmor/sidekick-code-web.git
cd sidekick-code-web
./start-dev.sh
```

This automatically sets up the Python virtual environment, installs dependencies, and starts:
- Backend server: http://localhost:8000
- Frontend server: http://localhost:5173

### Manual Setup

**Backend Setup:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

## Architecture

**Frontend (React + Vite)**
- React 18 with TypeScript
- Vite for development and building
- Tailwind CSS + shadcn/ui components
- React Query for state management
- React Router for navigation

**Backend (FastAPI)**
- FastAPI with Python 3.8+
- Pydantic for request/response validation
- DeepWiki MCP client for repository analysis
- Automatic markdown generation and ZIP packaging

**DeepWiki Integration**
- Model Context Protocol (MCP) for AI communication
- Persistent session management for performance
- Intelligent repository analysis and documentation generation

## API Reference

### POST /api/generate

Generates context files for a GitHub repository.

**Request Body:**
```json
{
  "github_url": "https://github.com/owner/repo",
  "selected_agents": ["claude", "cursor", "windsurf", "gemini"]
}
```

**Response:**
- Single agent: Returns file content directly
- Multiple agents: Returns base64-encoded ZIP archive

**Generated Filenames:**
- Claude → `claude.md`
- Cursor → `project_general.md`
- Windsurf → `windsurf.md`
- Gemini → `gemini.md`

### GET /health

Health check endpoint for monitoring backend status.

## Testing

**Backend API:**
```bash
# Health check
curl http://localhost:8000/health

# Generate context file
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"github_url":"https://github.com/octocat/Hello-World","selected_agents":["claude"]}'
```

**Frontend:**
1. Navigate to http://localhost:5173
2. Enter a GitHub repository URL
3. Select target agents
4. Click "Generate & Download"

## Deployment

**Frontend (GitHub Pages):**
```bash
cd frontend
npm run build
# Deploy dist/ folder to GitHub Pages
```

**Backend (Render/Railway):**
- Build: `cd backend && pip install -r requirements.txt`
- Start: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment: Set `DEBUG=false` and `CORS_ORIGINS`

**Docker:**
```bash
cd backend
docker build -t sidekick-code-api .
docker run -p 8000:8000 sidekick-code-api
```

## Configuration

**Backend (.env):**
```bash
DEBUG=false                    # Enable debug mode and API docs
CORS_ORIGINS=http://localhost:5173  # Allowed frontend origins
DEEPWIKI_TIMEOUT=60           # DeepWiki request timeout seconds
```

**Frontend (.env.local):**
```bash
VITE_API_URL=https://your-backend.render.com  # Custom backend URL
```

## Generated Context Files

Each markdown file provides comprehensive project context including:

- Project overview and architecture
- Development setup and dependencies
- Code organization and patterns
- Testing strategies and deployment
- Common troubleshooting solutions

## Technology Stack

**Frontend Dependencies:**
- React 18.3+ with TypeScript
- Vite 5.4+ for building
- Tailwind CSS for styling
- shadcn/ui component library
- React Query for data fetching

**Backend Dependencies:**
- FastAPI for web framework
- Pydantic for validation
- Requests for HTTP calls
- Python-dotenv for configuration

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Open Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [DeepWiki](https://deepwiki.com) for AI-powered repository analysis
- [shadcn/ui](https://ui.shadcn.com) for React components
- [FastAPI](https://fastapi.tiangolo.com) for Python web framework

---

Built by [Sahar Mor](https://github.com/saharmor) | [Clone on GitHub](https://github.com/saharmor/sidekick-code-web)