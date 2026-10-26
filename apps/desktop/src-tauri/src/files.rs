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
#[path = "files/trash.rs"]
mod trash;
#[path = "files/trash_mutations.rs"]
mod trash_mutations;
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
) -> Result<String, String> {
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

#[tauri::command]
pub fn file_list_trash(root_path: String) -> Result<Vec<trash::TrashItem>, String> {
    trash::list(&root_path)
}

#[tauri::command]
pub fn file_restore_trash(root_path: String, id: String) -> Result<(), String> {
    trash_mutations::restore(&root_path, &id)
}

#[tauri::command]
pub fn file_empty_trash(root_path: String) -> Result<(), String> {
    trash_mutations::empty(&root_path)
}

#[cfg(test)]
#[path = "files/metadata_paths_tests.rs"]
mod metadata_paths_tests;

#[cfg(test)]
#[path = "files/create_tests.rs"]
mod create_tests;

#[cfg(test)]
#[path = "files/read_tests.rs"]
mod read_tests;

#[cfg(test)]
#[path = "files/update_tests.rs"]
mod update_tests;

#[cfg(test)]
#[path = "files/move_file_tests.rs"]
mod move_file_tests;

#[cfg(test)]
#[path = "files/delete_tests.rs"]
mod delete_tests;

#[cfg(test)]
#[path = "files/trash_tests.rs"]
mod trash_tests;

#[cfg(test)]
#[path = "files/trash_mutations_tests.rs"]
mod trash_mutations_tests;
