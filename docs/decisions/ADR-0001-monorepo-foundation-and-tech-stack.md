# ADR-0001: Monorepo Foundation and Technology Stack

## Status
Accepted

## Context
XakuGraph is envisioned as a long-lived, high-performance Data & AI Visualization Studio running both in the browser (local web mode) and on the desktop (Windows installer via Tauri 2). We required an architecture that shares code cleanly, minimizes duplication, and enables native performance where justified.

## Decision
1. **Repository Layout:** A single monorepo containing `web/`, `desktop/`, `backend/`, `crates/`, and `scripts/`.
2. **Frontend:** React 18 with TypeScript, Tailwind CSS, and Vite. Shared directly between web and desktop builds without a duplicate UI.
3. **Backend Processing Engine:** Python 3.12 with FastAPI, Pydantic v2, Polars for tabular datasets, and NumPy/SciPy for mathematical operations.
4. **Desktop Shell:** Tauri 2 wrapping the single web frontend and communicating with the local processing engine.
5. **Native Core:** `crates/xakugraph-core` in Rust for mathematical and vector primitives.

## Consequences
- Single frontend codebase avoids divergent UIs.
- Polars provides high-speed column statistics and low-memory dataset parsing.
- Rust crate provides verifiable native mathematical correctness.
