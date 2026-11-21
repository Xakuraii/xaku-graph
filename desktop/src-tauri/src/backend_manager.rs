use serde::Serialize;
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub const DEFAULT_BACKEND_HOST: &str = "127.0.0.1";
pub const DEFAULT_BACKEND_PORT: u16 = 8000;

#[derive(Debug, Clone, Serialize)]
pub struct DesktopRuntimeInfo {
    pub core_version: String,
    pub app_version: String,
    pub platform: String,
    pub backend_url: String,
    pub backend_reachable: bool,
    pub managed_backend_pid: Option<u32>,
    pub backend_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeVectorResult {
    pub cosine_similarity: f64,
    pub cosine_distance: f64,
    pub euclidean_distance: f64,
    pub manhattan_distance: f64,
    pub dot_product: f64,
    pub dimension: usize,
}

pub struct BackendProcessState {
    child: Mutex<Option<Child>>,
}

impl Default for BackendProcessState {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }
}

impl BackendProcessState {
    pub fn managed_pid(&self) -> Option<u32> {
        let mut guard = self.child.lock().ok()?;
        if let Some(child) = guard.as_mut() {
            if matches!(child.try_wait(), Ok(None)) {
                return Some(child.id());
            }
            *guard = None;
        }
        None
    }

    pub fn stop(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

/// Checks if a local TCP endpoint is accepting connections within a short timeout.
pub fn is_port_reachable(host: &str, port: u16, timeout_ms: u64) -> bool {
    let addr_str = format!("{host}:{port}");
    let Ok(addr) = addr_str.parse::<SocketAddr>() else {
        return false;
    };
    TcpStream::connect_timeout(&addr, Duration::from_millis(timeout_ms)).is_ok()
}

/// Searches ancestor directories from `start_dir` for the XakuGraph `backend/` engine directory.
pub fn resolve_backend_dir_from(start_dir: &Path) -> Option<PathBuf> {
    for ancestor in start_dir.ancestors() {
        let direct_backend = ancestor.join("backend");
        if direct_backend.join("app").join("main.py").is_file() {
            return Some(direct_backend);
        }
        if ancestor.join("app").join("main.py").is_file() {
            return Some(ancestor.to_path_buf());
        }
    }
    None
}

/// Locates the backend directory using current working directory or current executable path.
pub fn resolve_backend_dir() -> Option<PathBuf> {
    if let Ok(cwd) = std::env::current_dir() {
        if let Some(found) = resolve_backend_dir_from(&cwd) {
            return Some(found);
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            if let Some(found) = resolve_backend_dir_from(parent) {
                return Some(found);
            }
        }
    }
    None
}

/// Finds the preferred Python interpreter inside `backend_dir/.venv` or falls back to system Python.
pub fn resolve_python_executable(backend_dir: &Path) -> String {
    let candidates = if cfg!(target_os = "windows") {
        [
            backend_dir.join(".venv").join("Scripts").join("python.exe"),
            backend_dir.join(".venv").join("bin").join("python"),
        ]
    } else {
        [
            backend_dir.join(".venv").join("bin").join("python"),
            backend_dir.join(".venv").join("Scripts").join("python.exe"),
        ]
    };

    for candidate in candidates {
        if candidate.is_file() {
            return candidate.to_string_lossy().into_owned();
        }
    }

    if cfg!(target_os = "windows") {
        "python".to_string()
    } else {
        "python3".to_string()
    }
}

/// Ensures the local FastAPI backend on `127.0.0.1:8000` is running, spawning it if needed.
pub fn ensure_local_backend(state: &BackendProcessState) -> DesktopRuntimeInfo {
    let backend_dir = resolve_backend_dir();

    if !is_port_reachable(DEFAULT_BACKEND_HOST, DEFAULT_BACKEND_PORT, 200) {
        if let Some(ref dir) = backend_dir {
            let should_spawn = state.managed_pid().is_none();
            if should_spawn {
                let python_bin = resolve_python_executable(dir);
                let mut cmd = Command::new(&python_bin);
                cmd.args([
                    "-m",
                    "uvicorn",
                    "app.main:app",
                    "--host",
                    DEFAULT_BACKEND_HOST,
                    "--port",
                    &DEFAULT_BACKEND_PORT.to_string(),
                ])
                .current_dir(dir)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null());

                #[cfg(target_os = "windows")]
                cmd.creation_flags(CREATE_NO_WINDOW);

                if let Ok(child) = cmd.spawn() {
                    if let Ok(mut guard) = state.child.lock() {
                        *guard = Some(child);
                    }
                    let deadline = Instant::now() + Duration::from_secs(4);
                    while Instant::now() < deadline {
                        if is_port_reachable(DEFAULT_BACKEND_HOST, DEFAULT_BACKEND_PORT, 150) {
                            break;
                        }
                        thread::sleep(Duration::from_millis(120));
                    }
                }
            }
        }
    }

    runtime_info_snapshot(state, backend_dir.as_deref())
}

pub fn runtime_info_snapshot(
    state: &BackendProcessState,
    backend_dir: Option<&Path>,
) -> DesktopRuntimeInfo {
    let resolved_dir = backend_dir
        .map(Path::to_path_buf)
        .or_else(resolve_backend_dir);
    DesktopRuntimeInfo {
        core_version: xakugraph_core::version().to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
        backend_url: format!("http://{DEFAULT_BACKEND_HOST}:{DEFAULT_BACKEND_PORT}/api"),
        backend_reachable: is_port_reachable(DEFAULT_BACKEND_HOST, DEFAULT_BACKEND_PORT, 150),
        managed_backend_pid: state.managed_pid(),
        backend_dir: resolved_dir.map(|p| p.to_string_lossy().into_owned()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::net::TcpListener;

    #[test]
    fn test_resolve_backend_dir_from_nested_desktop_path() {
        let unique = format!("xakugraph_test_{}", std::process::id());
        let root = std::env::temp_dir().join(unique);
        let nested = root.join("desktop").join("src-tauri");
        let app_dir = root.join("backend").join("app");
        fs::create_dir_all(&nested).expect("create nested dir");
        fs::create_dir_all(&app_dir).expect("create backend app dir");
        fs::write(app_dir.join("main.py"), "# fastapi").expect("write marker file");

        let resolved = resolve_backend_dir_from(&nested);
        assert_eq!(resolved.as_deref(), Some(root.join("backend").as_path()));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn test_resolve_python_executable_prefers_venv() {
        let unique = format!("xakugraph_py_{}", std::process::id());
        let backend = std::env::temp_dir().join(unique);
        let venv_scripts = if cfg!(target_os = "windows") {
            backend.join(".venv").join("Scripts")
        } else {
            backend.join(".venv").join("bin")
        };
        let py_name = if cfg!(target_os = "windows") {
            "python.exe"
        } else {
            "python"
        };
        fs::create_dir_all(&venv_scripts).expect("create venv dir");
        let expected_py = venv_scripts.join(py_name);
        fs::write(&expected_py, "").expect("create python placeholder");

        assert_eq!(
            resolve_python_executable(&backend),
            expected_py.to_string_lossy()
        );
        let _ = fs::remove_dir_all(&backend);
    }

    #[test]
    fn test_is_port_reachable_detects_bound_socket() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind ephemeral port");
        let port = listener.local_addr().expect("local addr").port();
        assert!(is_port_reachable("127.0.0.1", port, 200));
        drop(listener);
        assert!(!is_port_reachable("127.0.0.1", port, 150));
    }
}
