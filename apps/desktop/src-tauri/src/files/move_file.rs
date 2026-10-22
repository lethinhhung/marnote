use crate::files::metadata_paths::{rebase_manual_order, rebase_metadata_paths};
use crate::{
    metadata,
    workspace::{root, target},
};
use std::fs;

pub fn move_file(root_path: &str, source: &str, destination: &str) -> Result<(), String> {
    let r = root(root_path)?;
    let src = target(&r, source, true)?;
    let dst = target(&r, destination, false)?;
    if src.is_dir() && (dst == src || dst.starts_with(&src)) {
        return Err("A folder cannot be moved into itself or one of its subfolders".into());
    }
    if src == dst {
        return Ok(());
    }
    if dst.exists() {
        return Err("Destination already exists".into());
    }

    let mut metadata_store =
        metadata::read_metadata(&r).map_err(|e| format!("Metadata read failed: {}", e))?;
    let rebased = rebase_metadata_paths(&metadata_store, source, destination);
    let rebased_order = rebase_manual_order(&metadata_store, source, destination);

    fs::rename(&src, &dst).map_err(|e| e.to_string())?;

    metadata_store.entries = rebased;
    metadata_store.manual_order = rebased_order;
    metadata::write_metadata(&r, &metadata_store)
        .map_err(|e| format!("Metadata write failed: {}", e))?;

    Ok(())
}
