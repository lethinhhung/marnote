use crate::{metadata, workspace::{root, target}};
use std::{fs, io::Write, path::Path, time::{SystemTime, UNIX_EPOCH}};

fn current_timestamp_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn replace_atomically(path: &Path, content: &str, expected: &str) -> Result<(), String> {
    let tmp = path.with_file_name(format!(".marnote-{}.tmp", std::process::id()));
    let result = (|| {
        let mut f = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&tmp)
            .map_err(|e| e.to_string())?;
        f.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
        if fs::read_to_string(path).map_err(|e| e.to_string())? != expected {
            return Err("Conflict: file changed during update".into());
        }
        fs::rename(&tmp, path).map_err(|e| e.to_string())
    })();
    if result.is_err() {
        let _ = fs::remove_file(tmp);
    }
    result
}

pub fn update_markdown(
    root_path: &str,
    path: &str,
    content: &str,
    expected_content: &str,
) -> Result<(), String> {
    let r = root(root_path)?;
    let p = target(&r, path, true)?;
    if p.extension().and_then(|s| s.to_str()) != Some("md") {
        return Err("Expected a Markdown file".into());
    }
    if fs::read_to_string(&p).map_err(|e| e.to_string())? != expected_content {
        return Err("Conflict: file changed since it was read".into());
    }
    replace_atomically(&p, content, expected_content)?;

    let mut existing = metadata::read_metadata(&r).map_err(|e| format!("Metadata read failed: {}", e))?;
    let now = current_timestamp_ms();
    let mut entry_metadata = existing.entries.remove(path).unwrap_or_default();
    entry_metadata.updated_ms = Some(now);
    if entry_metadata.created_ms.is_none() {
        entry_metadata.created_ms = Some(now);
    }
    metadata::update_metadata(&r, path, entry_metadata).map_err(|e| format!("Metadata write failed: {}", e))?;

    Ok(())
}