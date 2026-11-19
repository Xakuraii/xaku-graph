#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "=== Starting XakuGraph Local-First Development Studio ==="

# Check Python and Node
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed." >&2; exit 1; }

# Initialize Backend Virtual Environment if needed
BACKEND_DIR="$PROJECT_ROOT/backend"
VENV_DIR="$BACKEND_DIR/.venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "[Setup] Creating Python virtual environment..."
    if command -v uv >/dev/null 2>&1; then
        uv venv --python 3.12 "$VENV_DIR"
        uv pip install -e "$BACKEND_DIR[dev]"
    else
        python3 -m venv "$VENV_DIR"
        "$VENV_DIR/bin/pip" install -e "$BACKEND_DIR[dev]"
    fi
fi

# Initialize Web node_modules if needed
WEB_DIR="$PROJECT_ROOT/web"
if [ ! -d "$WEB_DIR/node_modules" ]; then
    echo "[Setup] Installing frontend dependencies..."
    (cd "$WEB_DIR" && npm install)
fi

# Cleanup on exit
trap 'echo "Stopping servers..."; kill 0' EXIT

# Start servers
echo "[1/2] Starting FastAPI backend on http://127.0.0.1:8000 ..."
(cd "$BACKEND_DIR" && "$VENV_DIR/bin/python" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &

echo "[2/2] Starting Vite frontend on http://localhost:5173 ..."
(cd "$WEB_DIR" && npm run dev) &

echo "XakuGraph is live:"
echo "  - Web Studio:   http://localhost:5173"
echo "  - Backend API:  http://127.0.0.1:8000"
echo "  - OpenAPI Docs: http://127.0.0.1:8000/docs"

wait
