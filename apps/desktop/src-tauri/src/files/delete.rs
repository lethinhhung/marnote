use crate::{metadata, workspace::{root, target}};
use crate::files::metadata_paths::filter_metadata_for_delete;
use std::{fs, time::UNIX_EPOCH};

fn trash_name(path: &str) -> String {
    format!(
        "{:x}-{}",
        UNIX_EPOCH.elapsed().unwrap_or_default().as_nanos(),
        path.replace('/', "_")
    )
}

pub fn delete(root_path: &str, path: &str) -> Result<String, String> {
    let r = root(root_path)?;
    let src = target(&r, path, true)?;
    let trash = r.join(".marnote-trash");
    fs::create_dir_all(&trash).map_err(|e| e.to_string())?;

    let mut metadata_store = metadata::read_metadata(&r).map_err(|e| format!("Metadata read failed: {}", e))?;
    let filtered = filter_metadata_for_delete(&metadata_store, path);

    let dst = trash.join(trash_name(path));
    fs::rename(&src, &dst).map_err(|e| e.to_string())?;

    metadata_store.entries = filtered;
    metadata::write_metadata(&r, &metadata_store).map_err(|e| format!("Metadata write failed: {}", e))?;

    Ok(dst.strip_prefix(&r).unwrap().to_string_lossy().into_owned())
}
