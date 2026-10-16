use crate::workspace::{root, target};
use std::fs;

#[tauri::command]
pub fn folder_create(root_path: String, path: String) -> Result<(), String> {
    let workspace = root(&root_path)?;
    let folder = target(&workspace, &path, false)?;
    fs::create_dir(&folder).map_err(|error| error.to_string())
}
