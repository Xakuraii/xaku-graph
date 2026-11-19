#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "=== Running XakuGraph Quality & Lint Checks ==="

echo "[1/3] Checking Python (Ruff)..."
(cd "$PROJECT_ROOT/backend" && .venv/bin/ruff check app tests && .venv/bin/ruff format --check app tests)

echo "[2/3] Checking Frontend TypeScript (tsc)..."
(cd "$PROJECT_ROOT/web" && npm run lint)

echo "[3/3] Checking Rust Crates (cargo check)..."
cargo check -p xakugraph-core

echo "All checks passed cleanly."
