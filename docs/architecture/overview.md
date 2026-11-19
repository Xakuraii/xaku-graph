# XakuGraph System Architecture

## Overview

XakuGraph is designed as a modular, local-first Data & AI Visualization Studio. It maintains clear boundaries between user presentation, API transport, application services, and high-performance computation.

## Layer Decomposition

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│       React 18 + Vite + TypeScript + Tailwind CSS      │
│  (Modules: Datasets, Embeddings, Vectors, RAG, ML)     │
└───────────────────────────┬────────────────────────────┘
                            │
               REST / JSON (Local Loopback)
                            │
┌───────────────────────────▼────────────────────────────┐
│                    API Gateway Layer                   │
│         FastAPI (OpenAPI, Pydantic V2 Validation)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                 Application Services Layer             │
│  Dataset Profiling (Polars)   Vector Math (NumPy/SciPy)│
│  Embedding Models (PyTorch)   RAG Connectors (Read-only│
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                Native Computation & Core               │
│               xakugraph-core (Rust Library)            │
│         Tauri 2 Desktop Shell / Hardware Acceleration  │
└────────────────────────────────────────────────────────┘
```

## Key Invariants

1. **Local Privacy:** Data never leaves the user machine. No analytics or cloud telemetry.
2. **Deterministic Distance Calculation:** Distance and similarity calculations always use original high-dimensional vectors, never 2D or 3D reduced visualization coordinates.
3. **Non-destructive Vector DB Access:** Connectors to ChromaDB, Qdrant, and future vector databases must be read-only by default.
