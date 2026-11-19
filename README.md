# XakuGraph

> **High-Performance, Local-First Data & AI Visualization Studio**

XakuGraph is an open-source, local-first interactive visualization studio designed for software engineers, ML practitioners, students, and researchers. It enables deep exploration of tabular datasets, inspection of high-dimensional vectors, visualization of AI embeddings, evaluation of machine learning models, and interactive debugging of Retrieval-Augmented Generation (RAG) pipelines — all executing directly on your local machine with strict privacy and zero cloud dependencies.

---

## Key Capabilities

1. **Dataset Visualization (Phase 2):** Ingest and inspect CSV, JSON, JSONL, and Parquet data. Instant statistical profiling, column distributions, null detection, and memory-aware tabular browsing powered by Polars.
2. **Embedding Visualization (Phase 3):** High-dimensional representation analysis with pluggable model adapters, PCA, t-SNE, and UMAP dimensionality reduction in interactive 2D/3D WebGL environments.
3. **Vector & Similarity Explorer (Phase 4):** Precise mathematical vector operations (Cosine Similarity, Euclidean Distance, Dot Product, L2 Normalization) computed strictly in original high-dimensional space.
4. **RAG Visualization & Inspection (Phase 5):** Document chunking analysis, retrieval playground, and non-destructive read-only connectors for local vector databases (ChromaDB, Qdrant).
5. **ML Model Visualization (Phase 6):** Training and validation loss curves, classification confusion matrices, regression error plots, and feature importance analysis.

---

## Architectural Principles

- **Local-First & Private:** Datasets and vector stores are never sent to external servers or telemetry.
- **Shared Engine:** A unified Python 3.12 engine (FastAPI, Polars, Scikit-learn) and native Rust core (`xakugraph-core`) power both the web and desktop applications.
- **Cross-Platform:** Runs as a responsive local web application or a native Windows desktop app via Tauri 2.

---

## Repository Structure

```
XakuGraph/
├── AGENTS.md                  # Permanent AI & engineering agent instructions
├── README.md                  # Project overview & quick start
├── Cargo.toml                 # Cargo workspace configuration
├── .python-version            # Python 3.12 pinned version
├── web/                       # React 18 + Vite + Tailwind CSS frontend
├── desktop/                   # Tauri 2 Windows desktop shell
├── backend/                   # FastAPI + Polars + Scikit-learn backend engine
├── crates/                    # Native Rust crates
│   └── xakugraph-core/        # Native mathematical and vector primitives
├── scripts/                   # Developer automation scripts (PowerShell & Bash)
├── tests/                     # Integration and end-to-end test suites
├── docs/                      # Architecture, ADRs, and API documentation
├── .agent/                    # Context, rules, and workflows for coding agents
└── data/                      # Local datasets, samples, and cache
```

---

## Quick Start (Windows PowerShell)

### Prerequisites
- **Python 3.12** (managed with `uv` recommended)
- **Node.js** (v20+ with `npm`)
- **Rust & Cargo** (>= 1.80)

### 1. Launch Local Development Studio
Run the automated PowerShell launcher. It verifies prerequisites, sets up virtual environments, installs dependencies, and boots both the FastAPI backend and Vite frontend concurrently:

```powershell
./scripts/dev.ps1
```

Once running, access:
- **Web Studio:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive OpenAPI Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Run All Automated Tests
```powershell
./scripts/test.ps1
```
Runs Rust core tests, backend pytest suite, and frontend Vitest suite.

### 3. Run Quality & Lint Checks
```powershell
./scripts/check.ps1
```
Runs Ruff lint & format checks, TypeScript compilation checks (`tsc --noEmit`), and Rust compiler checks.

### 4. Build Production Distributions
```powershell
./scripts/build.ps1
```
To build the Tauri desktop installer on Windows, pass `-Desktop`:
```powershell
./scripts/build.ps1 -Desktop
```

---

## Linux & macOS Equivalent Commands

```bash
chmod +x scripts/*.sh
./scripts/dev.sh     # Launch development servers
./scripts/test.sh    # Run automated test suites
./scripts/check.sh   # Run linters and typecheckers
./scripts/build.sh   # Build production packages
```

---

## License

Dual-licensed under either Apache License 2.0 or MIT License at your option. See `LICENSE` for details.
