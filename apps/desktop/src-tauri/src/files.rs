use crate::workspace::{root, target};
use serde::Serialize;
use std::{fs, io::Write, path::Path, time::UNIX_EPOCH};
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    path: String,
    content: String,
    modified_ms: u128,
}

#[tauri::command]
pub fn file_read_markdown(root_path: String, path: String) -> Result<Document, String> {
    let r = root(&root_path)?;
    let p = target(&r, &path, true)?;
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
        path,
        content,
        modified_ms,
    })
}

#[tauri::command]
pub fn file_create_markdown(
    root_path: String,
    path: String,
    content: String,
) -> Result<(), String> {
    let r = root(&root_path)?;
    let p = target(&r, &path, false)?;
    if p.extension().and_then(|s| s.to_str()) != Some("md") {
        return Err("Expected a .md path".into());
    }
    let mut f = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&p)
        .map_err(|e| e.to_string())?;
    f.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    f.sync_all().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn file_update_markdown(
    root_path: String,
    path: String,
    content: String,
    expected_content: String,
) -> Result<(), String> {
    let r = root(&root_path)?;
    let p = target(&r, &path, true)?;
    if p.extension().and_then(|s| s.to_str()) != Some("md") {
        return Err("Expected a Markdown file".into());
    }
    if fs::read_to_string(&p).map_err(|e| e.to_string())? != expected_content {
        return Err("Conflict: file changed since it was read".into());
    }
    replace_atomically(&p, &content, &expected_content)
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

#[tauri::command]
pub fn file_move(root_path: String, source: String, destination: String) -> Result<(), String> {
    let r = root(&root_path)?;
    let src = target(&r, &source, true)?;
    let dst = target(&r, &destination, false)?;
    if src.is_dir() && (dst == src || dst.starts_with(&src)) {
        return Err("A folder cannot be moved into itself or one of its subfolders".into());
    }
    if src == dst {
        return Ok(());
    }
    if dst.exists() {
        return Err("Destination already exists".into());
    }
    fs::rename(src, dst).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn file_delete(root_path: String, path: String) -> Result<String, String> {
    let r = root(&root_path)?;
    let src = target(&r, &path, true)?;
    let trash = r.join(".marnote-trash");
    fs::create_dir_all(&trash).map_err(|e| e.to_string())?;
    let dst = trash.join(trash_name(&path));
    fs::rename(src, &dst).map_err(|e| e.to_string())?;
    Ok(dst.strip_prefix(&r).unwrap().to_string_lossy().into_owned())
}
fn trash_name(path: &str) -> String {
    format!(
        "{:x}-{}",
        UNIX_EPOCH.elapsed().unwrap_or_default().as_nanos(),
        path.replace('/', "_")
    )
}
