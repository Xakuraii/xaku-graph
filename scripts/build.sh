#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "=== Building XakuGraph Monorepo ==="

echo "[1/2] Building Rust core crate (xakugraph-core)..."
cargo build --release -p xakugraph-core

echo "[2/2] Building Web Frontend distribution..."
(cd "$PROJECT_ROOT/web" && npm run build)

echo "Build complete."
