mod create_name;
mod files;
mod folders;
mod metadata;
mod metadata_commands;
mod tags;
#[cfg(test)]
mod tags_tests;
mod tree;
mod workspace;

#[macro_export]
macro_rules! invoke_handler {
    () => {
        $crate::invoke_handler!(@build $crate::workspace::default_workspace)
    };
    (test) => {
        // The default_workspace command requires the production Wry AppHandle runtime.
        $crate::invoke_handler!(@build)
    };
    (@build $( $extra:path ),*) => {
        tauri::generate_handler![
            $crate::workspace::open_workspace,
            $crate::workspace::list_workspace_tree,
            $crate::files::file_read_markdown,
            $crate::files::file_create_markdown,
            $crate::files::file_update_markdown,
            $crate::files::file_move,
            $crate::files::file_delete,
            $crate::files::file_list_trash,
            $crate::files::file_restore_trash,
            $crate::files::file_empty_trash,
            $crate::folders::folder_create,
            $crate::metadata_commands::update_entry_metadata,
            $crate::metadata_commands::save_workspace_tags,
            $crate::metadata_commands::save_manual_order,
            $crate::tags::rename_workspace_tag,
            $( $extra, )*
        ]
    };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init());
    #[cfg(feature = "wdio")]
    let builder = builder
        .plugin(tauri_plugin_wdio::init())
        .plugin(tauri_plugin_wdio_webdriver::init());

    builder
        .invoke_handler(invoke_handler!())
        .run(tauri::generate_context!())
        .expect("failed to run Marnote");
}

#[cfg(test)]
mod ipc_lifecycle_tests;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn metadata_update_preserves_omitted_fields_and_persists_change() {
        let root =
            std::env::temp_dir().join(format!("marnote-metadata-command-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(root.join("note.md"), "note").unwrap();
        metadata::update_metadata(
            &root,
            "note.md",
            metadata::EntryMetadata {
                tags: Some(vec!["old".into()]),
                icon: Some("📘".into()),
                favorite: Some(false),
                created_ms: Some(10),
                updated_ms: Some(20),
            },
        )
        .unwrap();

        metadata_commands::update_entry_metadata(
            root.to_string_lossy().into_owned(),
            "note.md".into(),
            None,
            None,
            Some(true),
        )
        .unwrap();

        let saved = metadata::read_metadata(&root).unwrap();
        let entry = saved.entries.get("note.md").unwrap();
        assert_eq!(entry.tags.as_deref(), Some(&["old".to_string()][..]));
        assert_eq!(entry.icon.as_deref(), Some("📘"));
        assert_eq!(entry.favorite, Some(true));
        assert_eq!(entry.created_ms, Some(10));
        assert_eq!(entry.updated_ms, Some(20));
        let _ = std::fs::remove_dir_all(&root);
    }
}
