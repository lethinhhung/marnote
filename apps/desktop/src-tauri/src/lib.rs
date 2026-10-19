mod files;
mod folders;
mod metadata;
mod tree;
mod workspace;

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
        metadata.icon = if icon.trim().is_empty() { None } else { Some(icon) };
    }
    if let Some(favorite) = favorite {
        metadata.favorite = Some(favorite);
    }
    metadata::update_metadata(&root, &path, metadata)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            workspace::open_workspace,
            workspace::default_workspace,
            workspace::list_workspace_tree,
            files::file_read_markdown,
            files::file_create_markdown,
            files::file_update_markdown,
            files::file_move,
            files::file_delete,
            folders::folder_create,
            update_entry_metadata
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Marnote");
}

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
