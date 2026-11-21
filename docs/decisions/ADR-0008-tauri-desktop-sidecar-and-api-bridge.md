# ADR-0008: Tauri 2 Desktop Backend Lifecycle & Dynamic API Bridge

- **Status:** Accepted
- **Date:** 2026-11-21
- **Phase:** 7 (Windows Desktop Application)

---

## Context

XakuGraph uses the same React frontend (`web/`) for both browser usage (`http://localhost:5173`) and the packaged Windows Tauri 2 desktop application (`desktop/src-tauri/`). Two structural differences arise when moving from Vite dev mode to WebView2 desktop runtime:
1. Packaged Tauri 2 apps on Windows load static assets from `http://tauri.localhost` without Vite's `/api` dev proxy, causing relative `/api/*` `fetch()` calls to fail against `tauri.localhost` unless routed to the local FastAPI engine and explicitly permitted via CORS.
2. Users launching the desktop binary outside `dev.ps1` expect the local FastAPI engine (`127.0.0.1:8000`) to start automatically (without spawning an extra terminal window) and shut down cleanly when the desktop window exits.

---

## Decision

1. **Managed Local FastAPI Process in Rust (`desktop/src-tauri/src/backend_manager.rs`):**
   - `BackendProcessState` manages an optional spawned Python child process running `uvicorn app.main:app --host 127.0.0.1 --port 8000` (with `CREATE_NO_WINDOW` on Windows).
   - If port `8000` is already bound (e.g., via `dev.ps1 -Desktop` or a separate backend session), the existing server is reused cleanly instead of colliding on the port.
   - Packaged builds start the backend automatically in `.setup()`; any spawned child is stopped on `RunEvent::Exit` / `RunEvent::ExitRequested`.

2. **Tauri-Aware `API_BASE` Resolution Without Extra Frontend Dependencies (`web/src/services/desktopBridge.ts`):**
   - Rather than coupling Vitest and web builds to an external `@tauri-apps/api` package, `desktopBridge.ts` inspects Tauri 2's injected `window.__TAURI_INTERNALS__?.invoke` (and `tauri.localhost` / `tauri:` origins) natively.
   - `apiClient.ts` resolves URLs via `resolveApiBase()`: `/api` on standard web origins and `http://127.0.0.1:8000/api` inside Tauri desktop builds.
   - `backend/app/core/config.py` explicitly allows `http://tauri.localhost` and `https://tauri.localhost` in `ALLOWED_ORIGINS`.

3. **Auto-Recovery Health Flow & Direct Native IPC:**
   - `App.tsx` automatically invokes `ensure_backend_running` when `/api/health` fails inside Tauri, and `Header.tsx` surfaces a `Reconnect` trigger if offline.
   - Native vector metrics remain callable directly via `compute_vector_similarity_native` backed by `xakugraph-core`.

---

## Consequences

- Browser development, production web hosting, and the Windows Tauri 2 desktop executable share one codebase (`web/` + `backend/` + `xakugraph-core`) with zero duplicated business logic.
- Both `dev.ps1 -Desktop` (hot-reload Vite + Cargo dev) and standalone desktop builds (`build.ps1 -Desktop` / `--no-bundle`) connect reliably to the local engine without console flashes or CORS errors.
