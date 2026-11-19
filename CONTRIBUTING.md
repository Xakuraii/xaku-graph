# Contributing to XakuGraph

Thank you for your interest in contributing to XakuGraph!

## Getting Started
1. Review `AGENTS.md` and `docs/architecture/overview.md`.
2. Follow `docs/development/setup-guide.md` to configure your environment.
3. Run `./scripts/check.ps1` and `./scripts/test.ps1` before submitting pull requests.

## Development Standards
- Python code must pass Ruff checks without warnings (`ruff check` and `ruff format`).
- Frontend code must pass TypeScript typechecking (`npm run lint` in `web/`).
- Rust code must format cleanly and pass `cargo test`.
- Include automated tests for any new features or bug fixes.
