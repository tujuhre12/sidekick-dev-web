#!/bin/bash

# Sidekick Code Development Startup Script
# This script starts both the frontend and backend for local development

echo "🚀 Starting Sidekick Code Development Environment..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping development servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
echo "📦 Starting backend server..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📚 Installing backend dependencies..."
pip install -r requirements.txt

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 Created .env file from .env.example"
fi

# Start backend server
echo "🔥 Starting FastAPI server on http://localhost:8000..."
python run.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "⚛️ Starting frontend server..."
cd ../frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📚 Installing frontend dependencies..."
    npm install
fi

# Start frontend server
echo "🔥 Starting React development server on http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Development environment is ready!"
echo "   🌐 Frontend: http://localhost:5173"
echo "   🔗 Backend API: http://localhost:8000"
echo "   📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait