# Changelog

All notable changes to XakuGraph will be documented in this file.

## [0.1.0] - Phase 0 & Phase 1 Foundation

### Added
- Monorepo structure with `web/`, `desktop/`, `backend/`, `crates/`, and `scripts/`.
- Rust core crate `xakugraph-core` providing vector math primitives (cosine similarity, euclidean distance, dot product, normalization) with unit test coverage.
- Python 3.12 FastAPI processing engine configured with Polars, NumPy, SciPy, Scikit-learn, and Pydantic V2 schemas.
- Dataset inspection service and API endpoint serving the Iris benchmark sample dataset.
- High-dimensional vector similarity endpoint with mathematical validation.
- Shared React 18 + TypeScript + Vite frontend with Tailwind CSS, dark/light theme support, and sidebar navigation across all 5 planned studio modules.
- Desktop shell configuration with Tauri 2 linked directly to the shared frontend.
- Cross-platform PowerShell and Bash automation scripts (`dev`, `build`, `test`, `check`).
- GitHub Actions CI workflow for Rust, Python, and TypeScript validation.
- Developer documentation, architecture specifications, ADR-0001, and ADR-0002.
