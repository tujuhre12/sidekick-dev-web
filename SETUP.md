# Sidekick Dev Setup Guide

This guide will help you set up the Sidekick Dev application for development or production.

## 📋 Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 16+** (for frontend)
- **Git** (for cloning the repository)

## 🚀 Quick Development Setup

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/saharmor/sidekick-code-web.git
cd sidekick-code-web

# Run the setup script (starts both frontend and backend)
./start-dev.sh
```

This will automatically:
- Set up Python virtual environment
- Install all dependencies
- Create environment files
- Start both servers

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Start the backend server
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

## 🧪 Testing the Setup

### Test Backend API

```bash
cd backend

# Activate virtual environment if not already active
source venv/bin/activate

# Run the test script
python test_api.py
```

### Test Frontend

1. Open http://localhost:5173 in your browser
2. Enter a GitHub repository URL (e.g., `https://github.com/octocat/Hello-World`)
3. Select one or more agents (Claude, Cursor, Windsurf, Gemini)
4. Click "Generate & Download"
5. Verify the file downloads correctly

## 📁 Project Structure

```
sidekick-code-web/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main FastAPI application
│   ├── models.py           # Pydantic models
│   ├── services.py         # Business logic
│   ├── deepwiki_client.py  # DeepWiki integration
│   ├── config.py           # Configuration
│   ├── requirements.txt    # Python dependencies
│   ├── .env               # Environment variables
│   ├── run.py             # Development server
│   ├── test_api.py        # API test script
│   └── README.md          # Backend documentation
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/Index.tsx # Main page component
│   │   ├── config.ts      # Frontend configuration
│   │   └── ...
│   ├── package.json       # Node.js dependencies
│   └── ...
├── start-dev.sh           # Development setup script
├── README.md              # Main documentation
└── SETUP.md              # This file
```

## 🔧 Configuration

### Backend Configuration (.env)

```bash
# Development mode (enables debug logging and API docs)
DEBUG=true

# CORS origins (comma-separated, no spaces)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Server settings
HOST=0.0.0.0
PORT=8000

# DeepWiki settings
DEEPWIKI_TIMEOUT=60
DEEPWIKI_SESSION_TIMEOUT=30
```

### Frontend Configuration

The frontend automatically detects the backend URL. For custom backend URLs, create `.env.local`:

```bash
# Custom backend URL
VITE_API_URL=https://your-backend-url.com
```

## 🚀 Production Deployment

### Backend Deployment (Render)

1. **Create Render Account**: Sign up at https://render.com
2. **Connect Repository**: Link your GitHub repository
3. **Create Web Service**:
   - **Environment**: Python 3
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables**:
   ```
   DEBUG=false
   CORS_ORIGINS=https://yourdomain.github.io
   ```

### Frontend Deployment (GitHub Pages)

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Update API URL**: Create `frontend/.env.production`:
   ```bash
   VITE_API_URL=https://your-backend.onrender.com
   ```

3. **Deploy to GitHub Pages**:
   - Push the `dist/` folder to `gh-pages` branch
   - Enable GitHub Pages in repository settings

### Docker Deployment

```bash
# Build backend image
cd backend
docker build -t sidekick-dev-api .

# Run backend container
docker run -p 8000:8000 \
  -e DEBUG=false \
  -e CORS_ORIGINS=https://yourdomain.com \
  sidekick-dev-api

# For frontend, use any static file server
cd frontend
npm run build
# Serve dist/ folder with nginx, apache, or similar
```

## 🔍 Troubleshooting

### Common Issues

#### Backend Issues

**"Module not found" errors:**
```bash
# Make sure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

**CORS errors in browser:**
```bash
# Update CORS_ORIGINS in backend/.env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

**DeepWiki connection errors:**
- Check internet connection
- Verify DeepWiki service status
- Check logs for detailed error messages

#### Frontend Issues

**API connection errors:**
- Ensure backend is running on http://localhost:8000
- Check browser console for CORS errors
- Verify API_ENDPOINTS in `src/config.ts`

**Build errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

Enable detailed logging:

**Backend:**
```bash
# Set DEBUG=true in .env
DEBUG=true

# Or run with debug flag
DEBUG=true python run.py
```

**Frontend:**
```bash
# Check browser console for detailed logs
# Open Developer Tools → Console
```

### Testing Individual Components

**Test DeepWiki Connection:**
```bash
cd backend
source venv/bin/activate
python -c "
from deepwiki_client import DeepWikiClient
client = DeepWikiClient()
print('Connected:', client.is_initialized)
"
```

**Test API Endpoints:**
```bash
# Health check
curl http://localhost:8000/health

# Generate test
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"github_url":"https://github.com/octocat/Hello-World","selected_agents":["claude"]}'
```

## 📞 Getting Help

If you encounter issues:

1. **Check the logs**: Look for error messages in terminal output
2. **Verify prerequisites**: Ensure Python 3.8+ and Node.js 16+ are installed
3. **Run tests**: Use `backend/test_api.py` to verify backend functionality
4. **Check configuration**: Verify `.env` files are properly configured
5. **Create an issue**: Open a GitHub issue with detailed error information

## 🎯 Next Steps

After successful setup:

1. **Customize**: Modify the universal prompt template in `backend/config.py`
2. **Extend**: Add support for new coding agents
3. **Deploy**: Set up production deployment
4. **Monitor**: Add logging and monitoring for production use

Happy coding! 🚀