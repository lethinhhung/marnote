#[path = "files/create.rs"]
mod create;
#[path = "files/delete.rs"]
mod delete;
#[path = "files/metadata_paths.rs"]
mod metadata_paths;
#[path = "files/move_file.rs"]
mod move_file;
#[path = "files/read.rs"]
mod read;
#[path = "files/update.rs"]
mod update;

use create::create_markdown;
use delete::delete;
use move_file::move_file;
use read::read_markdown;
use update::update_markdown;

#[tauri::command]
pub fn file_create_markdown(
    root_path: String,
    path: String,
    content: String,
) -> Result<(), String> {
    create_markdown(&root_path, &path, &content)
}

#[tauri::command]
pub fn file_read_markdown(root_path: String, path: String) -> Result<read::Document, String> {
    read_markdown(&root_path, &path)
}

#[tauri::command]
pub fn file_update_markdown(
    root_path: String,
    path: String,
    content: String,
    expected_content: String,
) -> Result<(), String> {
    update_markdown(&root_path, &path, &content, &expected_content)
}

#[tauri::command]
pub fn file_move(root_path: String, source: String, destination: String) -> Result<(), String> {
    move_file(&root_path, &source, &destination)
}

#[tauri::command]
pub fn file_delete(root_path: String, path: String) -> Result<String, String> {
    delete(&root_path, &path)
}

#[cfg(test)]
#[path = "files/metadata_paths_tests.rs"]
mod metadata_paths_tests;