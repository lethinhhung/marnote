use crate::files::{
    metadata_paths::{filter_manual_order, filter_metadata_for_delete},
    trash::{read_index, write_index, TrashRecord},
};
use crate::{
    metadata,
    workspace::{root, target},
};
use std::{fs, time::UNIX_EPOCH};

fn trash_name(path: &str) -> String {
    let encoded: String = path
        .as_bytes()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    format!(
        "{:x}-{encoded}",
        UNIX_EPOCH.elapsed().unwrap_or_default().as_nanos()
    )
}

pub fn delete(root_path: &str, path: &str) -> Result<String, String> {
    let r = root(root_path)?;
    let src = target(&r, path, true)?;
    let trash = r.join(".marnote-trash");
    fs::create_dir_all(&trash).map_err(|e| e.to_string())?;

    let mut metadata_store =
        metadata::read_metadata(&r).map_err(|e| format!("Metadata read failed: {}", e))?;
    let filtered = filter_metadata_for_delete(&metadata_store, path);
    let filtered_order = filter_manual_order(&metadata_store, path);

    let dst = trash.join(trash_name(path));
    let id = dst.file_name().unwrap().to_string_lossy().into_owned();
    let entries = metadata_store
        .entries
        .iter()
        .filter(|(key, _)| *key == path || key.starts_with(&format!("{path}/")))
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    let parent = std::path::Path::new(path)
        .parent()
        .unwrap_or(std::path::Path::new(""))
        .to_string_lossy()
        .replace('\\', "/");
    let manual_order = metadata_store
        .manual_order
        .iter()
        .filter(|(key, _)| {
            key.as_str() == parent || key.as_str() == path || key.starts_with(&format!("{path}/"))
        })
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    let kind = if src.is_dir() { "directory" } else { "file" }.to_string();
    let mut index = read_index(&r)?;
    fs::rename(&src, &dst).map_err(|e| e.to_string())?;

    index.insert(
        id.clone(),
        TrashRecord {
            path: path.to_owned(),
            kind,
            entries,
            manual_order,
        },
    );
    if let Err(error) = write_index(&r, &index) {
        let _ = fs::rename(&dst, &src);
        return Err(error);
    }

    metadata_store.entries = filtered;
    metadata_store.manual_order = filtered_order;
    if let Err(error) = metadata::write_metadata(&r, &metadata_store) {
        let _ = fs::rename(&dst, &src);
        index.remove(&id);
        let _ = write_index(&r, &index);
        return Err(format!("Metadata write failed: {}", error));
    }

    Ok(dst.strip_prefix(&r).unwrap().to_string_lossy().into_owned())
}
