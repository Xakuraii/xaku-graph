# AGENTS.md — Permanent Operating Instructions for AI & Engineering Agents

Welcome to **XakuGraph**. As an engineering agent working on this codebase, you must adhere strictly to the permanent operating instructions documented here.

---

## 1. Project Purpose & Philosophy

XakuGraph is a **local-first Data & AI Visualization Studio** that allows software developers, ML engineers, students, and researchers to explore datasets, inspect mathematical vectors, understand AI embeddings, visualize ML evaluation metrics, and debug RAG pipelines.

### Core Tenets:
1. **Local-First & Privacy-Preserving:** Never transmit user data, datasets, or vector contents to external cloud services or telemetry without explicit user intent.
2. **Deterministic & High-Performance:** Separate high-dimensional vector math from visual projections (PCA, t-SNE, UMAP). Never use 2D/3D projection coordinates for similarity calculations.
3. **Unified Engine:** The Python backend (FastAPI, Polars, Scikit-learn) and native Rust core (`xakugraph-core`) power both the web and desktop Tauri applications identically. Do not duplicate business logic.
4. **Clean Layer Boundaries:** Presentation (React), API contracts (Pydantic/TypeScript), application services, and native crates must remain cleanly decoupled.

---

## 2. Monorepo Directory Responsibilities

| Path | Responsibility |
|------|----------------|
| `web/` | React 18 + TypeScript + Vite + Tailwind CSS frontend application. Shared across web and desktop. |
| `desktop/` | Tauri 2 desktop shell (`src-tauri`). Points directly to `web/` dist and dev server. |
| `backend/` | Python 3.12 FastAPI processing engine (Polars, NumPy, Scikit-learn, Pydantic). |
| `crates/xakugraph-core/` | Reusable Rust crate for native computation, vector primitives, and benchmarks. |
| `scripts/` | Cross-platform automation scripts (`dev.ps1`, `build.ps1`, `test.ps1`, `check.ps1`, and `*.sh`). |
| `data/` | Local storage: `samples/` (checked in), `uploads/`, `processed/`, `cache/` (gitignored). |
| `docs/` | Architecture records, API specifications, and Architecture Decision Records (`docs/decisions/`). |
| `.agent/` | Domain context (`context/`), specific rules (`rules/`), and repeatable workflows (`workflows/`). |
| `.github/` | Continuous integration workflows and issue/PR templates. |

---

## 3. Technology Stack & Minimum Versions

- **OS Target:** Windows (primary), Linux, macOS
- **Python:** 3.12 (managed via `uv` with `.python-version`)
- **Node.js:** >= 20 (package manager: `npm`)
- **Rust / Cargo:** >= 1.80 (2021 edition)
- **Tauri:** 2.x
- **Frontend Stack:** React 18, TypeScript, Tailwind CSS, Lucide-React, Vitest
- **Backend Stack:** FastAPI, Pydantic v2, Polars, NumPy, SciPy, Scikit-learn, Ruff, Pytest

---

## 4. Coding Standards

### Python (Backend)
- Adhere to PEP 8 standards enforced by Ruff (`ruff check` and `ruff format`).
- Use modern Python 3.12 typing (`list[str]`, `dict[str, Any]`, `X | None`).
- Use Pydantic v2 `BaseModel` and `SettingsConfigDict` for configurations and data validation.
- All service methods must be type-annotated and handle errors explicitly with meaningful HTTP or custom exceptions (`raise ... from err`).
- Use asynchronous route handlers where beneficial, but keep CPU-bound heavy calculations isolated to avoid blocking the event loop.

### TypeScript / React (Frontend)
- Enable TypeScript strict mode with no implicit `any`.
- Keep business logic in `services/` or custom `hooks/`, not embedded inside UI presentational components.
- Style with Tailwind CSS utility classes; avoid inline styles.
- Support Dark and Light themes natively via Tailwind `class` mode.
- Avoid fabricated mock data in user-facing components; clearly label any sample fixture data as such.

### Rust (Core & Shell)
- Standard Rust formatting (`cargo fmt`).
- Provide thorough unit tests for all mathematical routines.
- Avoid premature rewrites: benchmark operations in Python before migrating them to Rust.
- Propagate errors using custom `thiserror` types; avoid unwrap in library code.

---

## 5. Mandatory Verification & Testing Rules

**The Iron Law:** No claims of completion without fresh verification evidence.

Before declaring any task or step complete:
1. Run backend tests: `cd backend && .venv\Scripts\pytest`
2. Run backend linter: `cd backend && .venv\Scripts\ruff check app tests`
3. Run frontend typecheck & tests: `cd web && npm run lint && npm test`
4. Run frontend build: `cd web && npm run build`
5. Run Rust tests: `cargo test -p xakugraph-core`

---

## 6. Security & Privacy Requirements

1. **Path Traversal Prevention:** Always validate and normalize file paths when saving or reading datasets.
2. **File Validation:** Restrict allowed file extensions to supported tabular formats (`.csv`, `.json`, `.jsonl`, `.parquet`).
3. **Safe Memory Bounds:** Impose dataset preview limits (`MAX_PREVIEW_ROWS`) and memory size constraints.
4. **Vector Database Connectors:** Must operate in **read-only mode** unless explicit destructive actions are commanded by the user with confirmation.

---

## 7. Development Workflow

1. Check `.agent/rules/` and `docs/decisions/` before modifying architectural components.
2. Maintain `task.md` or step checklists during complex refactorings.
3. Write automated tests concurrently with implementation code.
4. Record major structural choices in `docs/decisions/ADR-xxxx.md`.
