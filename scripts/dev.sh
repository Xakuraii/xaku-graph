#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

WEB_ONLY=false
FORCE_DESKTOP=false
REBUILD_DESKTOP=false

for arg in "$@"; do
    case "$arg" in
        --web-only)
            WEB_ONLY=true
            ;;
        --desktop)
            FORCE_DESKTOP=true
            ;;
        --rebuild)
            REBUILD_DESKTOP=true
            ;;
        *)
            echo "Unknown option: $arg (supported: --desktop, --web-only, --rebuild)" >&2
            exit 1
            ;;
    esac
done

echo "=== Starting XakuGraph Local-First Development Studio ==="

# Check Python and Node
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed." >&2; exit 1; }

DESKTOP_BIN="$PROJECT_ROOT/target/debug/xakugraph-desktop"
LAUNCH_DESKTOP=true
if [ "$WEB_ONLY" = true ] && [ "$FORCE_DESKTOP" = false ]; then
    LAUNCH_DESKTOP=false
fi

if [ "$LAUNCH_DESKTOP" = true ] && [ ! -x "$DESKTOP_BIN" ] && ! command -v cargo >/dev/null 2>&1; then
    if [ "$FORCE_DESKTOP" = true ]; then
        echo "Desktop executable not found and Rust/Cargo is unavailable." >&2
        exit 1
    fi
    echo "[Warn] Desktop executable and Rust/Cargo not found; falling back to Web-only mode."
    LAUNCH_DESKTOP=false
fi

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

if [ "$LAUNCH_DESKTOP" = true ] && { [ "$REBUILD_DESKTOP" = true ] || [ ! -x "$DESKTOP_BIN" ]; }; then
    echo "[Setup] Building XakuGraph desktop debug executable (one-time)..."
    cargo build -p xakugraph-desktop
fi

# Cleanup on exit
trap 'echo "Stopping servers..."; kill 0' EXIT

# Start backend and frontend servers
echo "[1/3] Starting FastAPI backend on http://127.0.0.1:8000 ..."
(cd "$BACKEND_DIR" && "$VENV_DIR/bin/python" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &

echo "[2/3] Starting Vite frontend on http://localhost:5173 ..."
(cd "$WEB_DIR" && npm run dev) &

if [ "$LAUNCH_DESKTOP" = true ]; then
    # Wait briefly for Vite dev server
    for _ in $(seq 1 40); do
        if (echo >/dev/tcp/127.0.0.1/5173) >/dev/null 2>&1; then
            break
        fi
        sleep 0.25
    done
    echo "[3/3] Launching XakuGraph Desktop App ($DESKTOP_BIN)..."
    echo "XakuGraph is live:"
    echo "  - Desktop App:  XakuGraph Native Window (Tauri 2)"
    echo "  - Web Studio:   http://localhost:5173"
    echo "  - Backend API:  http://127.0.0.1:8000"
    echo "  - OpenAPI Docs: http://127.0.0.1:8000/docs"
    "$DESKTOP_BIN"
    exit 0
fi

echo "XakuGraph is live:"
echo "  - Web Studio:   http://localhost:5173"
echo "  - Backend API:  http://127.0.0.1:8000"
echo "  - OpenAPI Docs: http://127.0.0.1:8000/docs"

wait
