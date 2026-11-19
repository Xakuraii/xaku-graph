// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn get_core_version() -> String {
    xakugraph_core::version().to_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_core_version])
        .run(tauri::generate_context!())
        .expect("error while running XakuGraph desktop application");
}
