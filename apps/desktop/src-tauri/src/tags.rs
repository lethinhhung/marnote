use crate::{metadata, workspace};

#[tauri::command]
pub fn rename_workspace_tag(root_path: String, old_name: String, new_name: String, color: String) -> Result<(), String> {
    let new_name = new_name.trim().trim_start_matches('#').to_owned();
    if new_name.is_empty() || color.strip_prefix('#').is_none_or(|hex| hex.len() != 6 || !hex.chars().all(|c| c.is_ascii_hexdigit())) {
        return Err("Tag name or color is invalid".into());
    }
    let root = workspace::root(&root_path)?;
    let mut store = metadata::read_metadata(&root)?;
    if old_name != new_name && store.tags.contains_key(&new_name) {
        return Err("A tag with that name already exists".into());
    }
    for entry in store.entries.values_mut() {
        if let Some(tags) = &mut entry.tags {
            for tag in tags.iter_mut() {
                if *tag == old_name { *tag = new_name.clone(); }
            }
        }
    }
    store.tags.remove(&old_name);
    store.tags.insert(new_name, color);
    metadata::write_metadata(&root, &store)
}
