# Standard Agent Development Workflow

1. **Read Requirements:** Check `AGENTS.md` and relevant architecture documentation.
2. **Implement Incrementally:** Keep changes minimal and focused.
3. **Verify Locally:**
   - Run backend checks: `cd backend && .venv\Scripts\pytest && .venv\Scripts\ruff check app tests`
   - Run frontend checks: `cd web && npm run lint && npm test && npm run build`
   - Run Rust checks: `cargo test -p xakugraph-core`
4. **Update Documentation:** Record architectural changes in `docs/decisions/` and progress in `CHANGELOG.md`.
