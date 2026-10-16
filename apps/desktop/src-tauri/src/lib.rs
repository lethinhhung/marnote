mod files;
mod tree;
mod workspace;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            workspace::open_workspace,
            workspace::list_workspace_tree,
            files::file_read_markdown,
            files::file_create_markdown,
            files::file_update_markdown,
            files::file_move,
            files::file_delete
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Marnote");
}
