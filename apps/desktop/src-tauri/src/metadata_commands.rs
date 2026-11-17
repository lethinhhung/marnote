use crate::{metadata, workspace};

#[tauri::command]
pub fn update_entry_metadata(
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
pub fn save_workspace_tags(
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
pub fn save_manual_order(
    root_path: String,
    parent: String,
    paths: Vec<String>,
) -> Result<(), String> {
    let root = workspace::root(&root_path)?;
    if !parent.is_empty() {
        workspace::target(&root, &parent, true)?;
    }
    for path in &paths {
        workspace::target(&root, path, true)?;
        let item_parent = std::path::Path::new(path)
            .parent()
            .unwrap_or(std::path::Path::new(""))
            .to_string_lossy()
            .replace('\\', "/");
        if item_parent != parent {
            return Err("Items must be siblings".into());
        }
    }
    let mut store = metadata::read_metadata(&root)?;
    store.manual_order.insert(parent, paths);
    metadata::write_metadata(&root, &store)
}
