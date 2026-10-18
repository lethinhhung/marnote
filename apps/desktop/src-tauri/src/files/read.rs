use crate::workspace::{root, target};
use serde::Serialize;
use std::{fs, path::Path, time::{SystemTime, UNIX_EPOCH}};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    path: String,
    content: String,
    modified_ms: u128,
}

pub fn read_markdown(root_path: &str, path: &str) -> Result<Document, String> {
    let r = root(root_path)?;
    let p = target(&r, path, true)?;
    if p.extension().and_then(|s| s.to_str()) != Some("md") || !p.is_file() {
        return Err("Expected a Markdown file".into());
    }
    let content = fs::read_to_string(&p).map_err(|e| e.to_string())?;
    let modified_ms = fs::metadata(&p)
        .and_then(|m| m.modified())
        .map_err(|e| e.to_string())?
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    Ok(Document {
        path: path.to_string(),
        content,
        modified_ms,
    })
}