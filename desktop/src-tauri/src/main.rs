// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend_manager;

use backend_manager::{
    ensure_local_backend, runtime_info_snapshot, BackendProcessState, DesktopRuntimeInfo,
    NativeVectorResult,
};
use tauri::{Manager, RunEvent};

#[tauri::command]
fn get_core_version() -> String {
    xakugraph_core::version().to_string()
}

#[tauri::command]
fn get_desktop_runtime_info(state: tauri::State<'_, BackendProcessState>) -> DesktopRuntimeInfo {
    runtime_info_snapshot(state.inner(), None)
}

#[tauri::command]
fn ensure_backend_running(state: tauri::State<'_, BackendProcessState>) -> DesktopRuntimeInfo {
    ensure_local_backend(state.inner())
}

#[tauri::command]
fn compute_vector_similarity_native(
    vector_a: Vec<f64>,
    vector_b: Vec<f64>,
) -> Result<NativeVectorResult, String> {
    let cos = xakugraph_core::cosine_similarity(&vector_a, &vector_b).map_err(|e| e.to_string())?;
    let cos_dist =
        xakugraph_core::cosine_distance(&vector_a, &vector_b).map_err(|e| e.to_string())?;
    let euc =
        xakugraph_core::euclidean_distance(&vector_a, &vector_b).map_err(|e| e.to_string())?;
    let man =
        xakugraph_core::manhattan_distance(&vector_a, &vector_b).map_err(|e| e.to_string())?;
    let dot = xakugraph_core::dot_product(&vector_a, &vector_b).map_err(|e| e.to_string())?;

    Ok(NativeVectorResult {
        cosine_similarity: cos,
        cosine_distance: cos_dist,
        euclidean_distance: euc,
        manhattan_distance: man,
        dot_product: dot,
        dimension: vector_a.len(),
    })
}

fn main() {
    let app = tauri::Builder::default()
        .manage(BackendProcessState::default())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let state = app.state::<BackendProcessState>();
            // Launch local FastAPI engine automatically only in packaged desktop releases
            // (in dev mode, Vite / scripts/dev.ps1 manages the reload backend).
            if !cfg!(debug_assertions) {
                let _ = ensure_local_backend(state.inner());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_core_version,
            get_desktop_runtime_info,
            ensure_backend_running,
            compute_vector_similarity_native
        ])
        .build(tauri::generate_context!())
        .expect("error while building XakuGraph desktop application");

    app.run(|app_handle, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
            let state = app_handle.state::<BackendProcessState>();
            state.stop();
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_native_vector_similarity_command() {
        let res = compute_vector_similarity_native(vec![1.0, 0.0], vec![0.0, 1.0])
            .expect("orthogonal computation succeeds");
        assert!((res.cosine_similarity - 0.0).abs() < 1e-9);
        assert!((res.euclidean_distance - std::f64::consts::SQRT_2).abs() < 1e-9);
        assert_eq!(res.dimension, 2);
    }
}
