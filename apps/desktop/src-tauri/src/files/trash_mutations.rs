use super::trash::{directory, read_index, write_index, TrashRecord, INDEX};
use crate::{
    metadata,
    workspace::{root, target},
};
use std::{
    collections::HashMap,
    fs,
    path::{Component, Path},
};

pub fn restore(root_path: &str, id: &str) -> Result<(), String> {
    if Path::new(id)
        .components()
        .any(|part| !matches!(part, Component::Normal(_)))
        || id == INDEX
    {
        return Err("Invalid trash item".into());
    }
    let root = root(root_path)?;
    let mut index: HashMap<String, TrashRecord> = read_index(&root)?;
    let record = index.get(id).cloned().ok_or("Trash item not found")?;
    let source = directory(&root).join(id);
    let destination = target(&root, &record.path, false)?;
    if destination.exists() {
        return Err("A workspace item already uses this path".into());
    }
    let mut store = metadata::read_metadata(&root)?;
    fs::rename(&source, &destination).map_err(|e| e.to_string())?;
    store.entries.extend(record.entries);
    for (parent, paths) in record.manual_order {
        let current = store.manual_order.remove(&parent).unwrap_or_default();
        let mut merged = paths;
        for path in current {
            if !merged.contains(&path) {
                merged.push(path);
            }
        }
        store.manual_order.insert(parent, merged);
    }
    if let Err(error) = metadata::write_metadata(&root, &store) {
        let _ = fs::rename(&destination, &source);
        return Err(error);
    }
    index.remove(id);
    write_index(&root, &index)
}

pub fn empty(root_path: &str) -> Result<(), String> {
    let root = root(root_path)?;
    let dir = directory(&root);
    if !dir.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.file_name().is_some_and(|name| name == INDEX) {
            continue;
        }
        let kind = fs::symlink_metadata(&path)
            .map_err(|e| e.to_string())?
            .file_type();
        if kind.is_dir() {
            fs::remove_dir_all(path).map_err(|e| e.to_string())?;
        } else {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    write_index(&root, &HashMap::new())
}
