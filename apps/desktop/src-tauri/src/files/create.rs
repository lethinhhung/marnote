use crate::files::markdown::is_markdown;
use crate::{metadata, workspace::{root, target}};
use std::{fs, io::Write, time::{SystemTime, UNIX_EPOCH}};

fn current_timestamp_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

pub fn create_markdown(
    root_path: &str,
    path: &str,
    content: &str,
) -> Result<(), String> {
    let r = root(root_path)?;
    let p = target(&r, path, false)?;
    if !is_markdown(&p) {
        return Err("Expected a .md path".into());
    }
    let mut f = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&p)
        .map_err(|e| e.to_string())?;
    f.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    f.sync_all().map_err(|e| e.to_string())?;

    let now = current_timestamp_ms();
    let meta = metadata::EntryMetadata {
        created_ms: Some(now),
        updated_ms: Some(now),
        ..Default::default()
    };
    metadata::update_metadata(&r, path, meta).map_err(|e| format!("Metadata write failed: {}", e))?;

    Ok(())
}