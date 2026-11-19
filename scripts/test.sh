#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "=== Running XakuGraph Test Suite ==="

echo "[1/3] Running Rust core tests..."
cargo test -p xakugraph-core

echo "[2/3] Running Python backend tests..."
(cd "$PROJECT_ROOT/backend" && .venv/bin/pytest)

echo "[3/3] Running Web frontend tests..."
(cd "$PROJECT_ROOT/web" && npm test)

echo "All tests passed successfully."
