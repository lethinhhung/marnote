mod create_name;
mod files;
mod folders;
mod metadata;
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
            $crate::update_entry_metadata,
            $crate::save_workspace_tags,
            $crate::save_manual_order,
            $crate::tags::rename_workspace_tag,
            $( $extra, )*
        ]
    };
}

#[tauri::command]
fn update_entry_metadata(
    root_path: String,
    path: String,
    tags: Option<Vec<String>>,
    icon: Option<String>,
    favorite: Option<bool>,
) -> Result<(), String> {
    let root = workspace::root(&root_path)?;
    workspace::target(&root, &path, true)?;

    let mut metadata = metadata::read_metadata(&root)?
        .entries
        .remove(&path)
        .unwrap_or_default();
    if let Some(tags) = tags {
        metadata.tags = Some(tags);
    }
    if let Some(icon) = icon {
        metadata.icon = if icon.trim().is_empty() {
            None
        } else {
            Some(icon)
        };
    }
    if let Some(favorite) = favorite {
        metadata.favorite = Some(favorite);
    }
    metadata::update_metadata(&root, &path, metadata)
}

#[tauri::command]
fn save_workspace_tags(
    root_path: String,
    tags: std::collections::HashMap<String, String>,
) -> Result<(), String> {
    let root = workspace::root(&root_path)?;
    let mut store = metadata::read_metadata(&root)?;
    store.tags = tags
        .into_iter()
        .filter(|(name, color)| !name.trim().is_empty() && color.starts_with('#'))
        .collect();
    metadata::write_metadata(&root, &store)
}

#[tauri::command]
fn save_manual_order(root_path: String, parent: String, paths: Vec<String>) -> Result<(), String> {
    let root = workspace::root(&root_path)?;
    if !parent.is_empty() {
        workspace::target(&root, &parent, true)?;
    }
    for path in &paths {
        workspace::target(&root, path, true)?;
        if std::path::Path::new(path)
            .parent()
            .unwrap_or(std::path::Path::new(""))
            .to_string_lossy()
            .replace('\\', "/")
            != parent
        {
            return Err("Items must be siblings".into());
        }
    }
    let mut store = metadata::read_metadata(&root)?;
    store.manual_order.insert(parent, paths);
    metadata::write_metadata(&root, &store)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
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

        update_entry_metadata(
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
