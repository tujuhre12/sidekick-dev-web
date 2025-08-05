# Sidekick Code - AI-Powered Coding Context Generator

🤖 Automatically generate high-quality markdown context files for coding agents like Claude Code, Cursor, Windsurf, and Gemini.

## 🌟 Features

- **Multi-Agent Support**: Generate context files for Claude Code, Cursor, Windsurf, and Gemini
- **GitHub Integration**: Analyze any public GitHub repository  
- **Smart Packaging**: Single file download or ZIP archive for multiple agents
- **AI-Powered**: Uses DeepWiki's MCP interface for intelligent repository analysis
- **Beautiful UI**: Modern, responsive interface built with React and Tailwind CSS
- **Fast & Reliable**: Optimized backend with persistent MCP sessions

## 🚀 Quick Start

### Option 1: One-Command Development Setup

```bash
# Clone the repository
git clone https://github.com/saharmor/sidekick-code-web.git
cd sidekick-code-web

# Start both frontend and backend
./start-dev.sh
```

This will:
- Set up Python virtual environment for backend
- Install all dependencies
- Start backend server on http://localhost:8000
- Start frontend server on http://localhost:5173

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env

# Start the server
python run.py
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🏗️ Architecture

### Frontend (React + Vite)
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: shadcn/ui component library
- **Build Tool**: Vite for fast development and builds
- **Hosting**: Designed for GitHub Pages deployment

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.8+
- **AI Integration**: DeepWiki MCP client for repository analysis
- **File Processing**: Automatic markdown generation and ZIP creation
- **Deployment**: Ready for Render, Railway, or Docker

### DeepWiki Integration
- **Endpoint**: https://mcp.deepwiki.com/mcp
- **Protocol**: Model Context Protocol (MCP) for AI communication
- **Features**: Repository analysis, code pattern extraction, documentation generation

## 📋 API Reference

### POST /api/generate

Generate context files for a GitHub repository.

**Request:**
```json
{
  "github_url": "https://github.com/owner/repo",
  "selected_agents": ["claude", "cursor", "windsurf", "gemini"]
}
```

**Response:**
- Single agent: Direct markdown file download
- Multiple agents: ZIP archive download

**Agent Mappings:**
- `claude` → `claude.md`
- `cursor` → `project_general.md` 
- `windsurf` → `windsurf.md`
- `gemini` → `gemini.md`

## 🧪 Testing

### Test the Backend API

```bash
# Health check
curl http://localhost:8000/health

# Generate context file
curl -X POST "http://localhost:8000/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/octocat/Hello-World",
    "selected_agents": ["claude"]
  }' \
  --output claude.md
```

### Frontend Testing
1. Open http://localhost:5173
2. Enter a GitHub repository URL
3. Select one or more target agents
4. Click "Generate & Download"

## 🚀 Deployment

### Frontend (GitHub Pages)

```bash
cd frontend
npm run build
# Deploy dist/ folder to GitHub Pages
```

### Backend (Render)

1. Connect your GitHub repository to Render
2. Set environment variables:
   - `DEBUG=false`
   - `CORS_ORIGINS=https://yourdomain.github.io`
3. Build command: `cd backend && pip install -r requirements.txt`
4. Start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

### Docker Deployment

```bash
cd backend
docker build -t sidekick-code-api .
docker run -p 8000:8000 sidekick-code-api
```

## 🔧 Configuration

### Backend Environment Variables

```bash
DEBUG=false                     # Enable/disable debug mode
CORS_ORIGINS=https://yourdomain.com  # Allowed frontend origins
HOST=0.0.0.0                   # Server host
PORT=8000                      # Server port
DEEPWIKI_TIMEOUT=60            # DeepWiki request timeout
```

### Frontend Environment Variables

```bash
VITE_API_URL=https://your-backend.render.com  # Backend API URL
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 Generated Context File Structure

Each generated markdown file includes:

- **Project Overview**: Purpose, goals, and target audience
- **Architecture & Structure**: System design and component organization
- **Development Setup**: Installation and configuration instructions
- **Code Organization**: Standards, patterns, and conventions
- **Key Features**: Implementation details and business logic
- **Testing Strategy**: Framework and best practices
- **Build & Deployment**: Process and configuration
- **Git Workflow**: Branching and release process
- **Common Patterns**: Recurring code patterns and best practices
- **Dependencies**: Key libraries and tools
- **Security**: Authentication and validation approaches
- **Troubleshooting**: Common issues and solutions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **DeepWiki**: For providing the MCP interface for repository analysis
- **shadcn/ui**: For the beautiful React component library
- **FastAPI**: For the high-performance Python web framework

---

**Made with ❤️ by [Sahar Mor](https://github.com/saharmor)**

For questions or support, please open an issue or reach out on GitHub.