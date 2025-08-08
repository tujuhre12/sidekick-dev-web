# ✨ Sidekick Dev

Automatically generate high-quality markdown context files for AI coding agents like Claude, Cursor, Windsurf, and Gemini by analyzing any public GitHub repository.

https://github.com/user-attachments/assets/aa944e4d-f537-4069-b44a-2894d7233e1c



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


## Deployment

**Frontend (GitHub Pages):**
```bash
cd frontend
npm run build:prod
# If deploying to GitHub Pages, ensure Vite base is set for subpath
# Site URL will be https://<user>.github.io/sidekick-code-web/
```

**Backend (Render):**
- Build: `cd backend && pip install -r requirements.txt`
- Start: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment: Set `DEBUG=false` and `CORS_ORIGINS`

**Docker:**
```bash
cd backend
docker build -t sidekick-dev-api .
docker run -p 8000:8000 sidekick-dev-api
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


## License

MIT License - see [LICENSE](LICENSE) file for details.
