# XakuGraph Desktop Shell Architecture (Tauri 2)

The `desktop/` application wraps the shared React UI (`web/dist`) in a native Windows Tauri 2 WebView2 shell (`xakugraph-desktop`), coordinates local FastAPI backend lifecycle management, and bridges direct `xakugraph-core` Rust primitives via Tauri IPC commands.

---

## 1. Component Topology

```text
+-------------------------------------------------------------------+
|                     xakugraph-desktop (Tauri 2)                   |
|  - WebView2 rendering web/dist (http://tauri.localhost)           |
|  - backend_manager.rs (BackendProcessState lifecycle)             |
|  - Tauri IPC commands -> xakugraph-core vector math               |
+-------------------------------+-----------------------------------+
                                |
        HTTP /api -> 127.0.0.1:8000 (CORS: http://tauri.localhost)
                                |
+-------------------------------v-----------------------------------+
|                  backend/ (FastAPI + Python 3.12)                 |
|  - uvicorn app.main:app --host 127.0.0.1 --port 8000              |
|  - Polars, Scikit-Learn, SQLite, Parquet, .npy local caches       |
+-------------------------------------------------------------------+
```

---

## 2. Backend Lifecycle & Windowless Spawning (`desktop/src-tauri/src/backend_manager.rs`)

- **Port Reuse:** `is_port_reachable("127.0.0.1:8000")` checks whether a developer-started FastAPI instance is already listening before spawning anything.
- **Path Resolution:** `resolve_backend_dir` walks upward from `CARGO_MANIFEST_DIR`, current working directory, and the executable directory to locate `backend/app/main.py`. `resolve_python_executable` prefers `backend/.venv/Scripts/python.exe` on Windows (or `.venv/bin/python` on Unix) before falling back to system `python`.
- **Silent Windows Execution:** Packaged desktop builds launch `uvicorn app.main:app --host 127.0.0.1 --port 8000` with `CREATE_NO_WINDOW` (`0x0800_0000`) so no console window flashes on Windows.
- **Shutdown Cleanup:** `main.rs` intercepts `RunEvent::Exit` and `RunEvent::ExitRequested` to terminate any managed backend child process cleanly.

---

## 3. Tauri IPC Commands (`desktop/src-tauri/src/main.rs`)

- `get_core_version() -> String`: Returns the linked `xakugraph-core` crate version.
- `get_desktop_runtime_info() -> DesktopRuntimeInfo`: Reports crate/app versions, OS target, `backend_url`, `backend_reachable`, `managed_backend_pid`, and `backend_dir`.
- `ensure_backend_running() -> DesktopRuntimeInfo`: On-demand startup/verification trigger invoked from the frontend auto-recovery path.
- `compute_vector_similarity_native(vector_a, vector_b)`: Calls `xakugraph_core::vector` primitives directly in native Rust without crossing HTTP.

---

## 4. Frontend Bridge & CORS (`web/src/services/desktopBridge.ts`)

- In standard web development (`http://localhost:5173`), `resolveApiBase()` returns `/api` (proxied by Vite).
- Inside Tauri desktop builds (`http://tauri.localhost`, `tauri:`, or injected `window.__TAURI_INTERNALS__.invoke`), `resolveApiBase()` routes requests directly to `http://127.0.0.1:8000/api` (unless overridden by `VITE_API_BASE`).
- `backend/app/core/config.py` includes `http://tauri.localhost` and `https://tauri.localhost` in `ALLOWED_ORIGINS`.
- On health-check failure in Tauri Desktop mode, `App.tsx` automatically triggers `ensureDesktopBackendRunning()` and re-checks `/api/health`, while `Header.tsx` exposes a manual `Reconnect` button.

---

## 5. Developer Workflows

- **Default Dev Mode (Windows / Unix):** `.\scripts\dev.ps1` (or `./scripts/dev.sh`) starts FastAPI (`127.0.0.1:8000`), Vite (`http://localhost:5173`), and launches the pre-built `target/debug/xakugraph-desktop` binary directly without rebuilding on every start (only running `cargo build -p xakugraph-desktop` once if missing or when `-Rebuild` / `--rebuild` is passed). Pass `-WebOnly` (`--web-only`) to run only the browser Web Studio + backend.
- **Desktop Quality & Test Checks:** `.\scripts\check.ps1` and `.\scripts\test.ps1` validate both `xakugraph-core` and `xakugraph-desktop` alongside Python and Vitest suites.
- **Release Binary / Bundle:** `.\scripts\build.ps1 -Desktop` compiles the frontend bundle and builds the Tauri application binary.
