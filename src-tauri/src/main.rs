#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod notes;

use tauri::Manager;

use notes::ParcelData;

#[tauri::command]
fn load_notes(app: tauri::AppHandle) -> Result<ParcelData, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir error: {e}"))?;
    notes::load(dir).map_err(|e| format!("load error: {e}"))
}

#[tauri::command]
fn save_notes(app: tauri::AppHandle, data: ParcelData) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir error: {e}"))?;
    notes::save(dir, &data).map_err(|e| format!("save error: {e}"))
}

#[tauri::command]
fn export_notes_json(data: ParcelData) -> Result<String, String> {
    notes::export_json(&data).map_err(|e| format!("export error: {e}"))
}

#[tauri::command]
fn export_notes_markdown(data: ParcelData) -> Result<String, String> {
    notes::export_markdown(&data).map_err(|e| format!("export error: {e}"))
}

#[tauri::command]
fn get_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir error: {e}"))?;
    Ok(dir.join("parcel").to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_notes, 
            save_notes,
            export_notes_json,
            export_notes_markdown,
            get_data_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
