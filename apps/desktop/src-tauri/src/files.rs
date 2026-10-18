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

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, path::PathBuf, sync::atomic::{AtomicU64, Ordering}};

    static TEST_WS_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_workspace() -> PathBuf {
        let mut base = std::env::temp_dir();
        base.push(format!("marnote-test-{}", std::process::id()));
        let counter = TEST_WS_COUNTER.fetch_add(1, Ordering::Relaxed);
        base.push(format!("ws-{}-{}", UNIX_EPOCH.elapsed().unwrap().as_nanos(), counter));
        fs::create_dir_all(&base).unwrap();
        base
    }

    fn ws_root(path: &PathBuf) -> String {
        path.to_string_lossy().into_owned()
    }

    #[test]
    fn file_create_markdown_requires_md_extension() {
        let ws = temp_workspace();
        let err = file_create_markdown(ws_root(&ws), "note.txt".into(), "content".into()).unwrap_err();
        assert_eq!(err, "Expected a .md path");
    }

    #[test]
    fn file_create_markdown_rejects_existing_file() {
        let ws = temp_workspace();
        let path = "note.md";
        file_create_markdown(ws_root(&ws), path.into(), "first".into()).unwrap();
        let err = file_create_markdown(ws_root(&ws), path.into(), "second".into()).unwrap_err();
        assert!(err.contains("already exists") || err.contains("File exists") || err.contains("exist"));
        let content = fs::read_to_string(ws.join(path)).unwrap();
        assert_eq!(content, "first");
    }

    #[test]
    fn file_create_markdown_succeeds() {
        let ws = temp_workspace();
        file_create_markdown(ws_root(&ws), "note.md".into(), "hello".into()).unwrap();
        let content = fs::read_to_string(ws.join("note.md")).unwrap();
        assert_eq!(content, "hello");
    }

    #[test]
    fn file_update_markdown_requires_md_extension() {
        let ws = temp_workspace();
        fs::write(ws.join("note.txt"), "initial").unwrap();
        let err = file_update_markdown(ws_root(&ws), "note.txt".into(), "new".into(), "initial".into()).unwrap_err();
        assert_eq!(err, "Expected a Markdown file");
    }

    #[test]
    fn file_update_markdown_rejects_stale_expected_content() {
        let ws = temp_workspace();
        file_create_markdown(ws_root(&ws), "note.md".into(), "initial".into()).unwrap();
        let err = file_update_markdown(ws_root(&ws), "note.md".into(), "new".into(), "stale".into()).unwrap_err();
        assert_eq!(err, "Conflict: file changed since it was read");
        let content = fs::read_to_string(ws.join("note.md")).unwrap();
        assert_eq!(content, "initial");
    }

    #[test]
    fn file_update_markdown_succeeds_atomically() {
        let ws = temp_workspace();
        file_create_markdown(ws_root(&ws), "note.md".into(), "initial".into()).unwrap();
        file_update_markdown(ws_root(&ws), "note.md".into(), "updated".into(), "initial".into()).unwrap();
        let content = fs::read_to_string(ws.join("note.md")).unwrap();
        assert_eq!(content, "updated");
    }

    #[test]
    fn file_update_markdown_preserves_original_on_conflict_during_write() {
        let ws = temp_workspace();
        file_create_markdown(ws_root(&ws), "note.md".into(), "initial".into()).unwrap();
        let path = ws.join("note.md");
        let tmp_name = format!(".marnote-{}.tmp", std::process::id());
        let tmp_path = path.with_file_name(tmp_name);
        fs::write(&tmp_path, "malicious").unwrap();
        let result = file_update_markdown(ws_root(&ws), "note.md".into(), "updated".into(), "initial".into());
        assert!(result.is_err());
        let content = fs::read_to_string(&path).unwrap();
        assert_eq!(content, "initial");
        assert!(!tmp_path.exists(), "temp file should be cleaned up on error");
    }

    #[test]
    fn file_move_succeeds_for_file() {
        let ws = temp_workspace();
        file_create_markdown(ws_root(&ws), "src.md".into(), "content".into()).unwrap();
        file_move(ws_root(&ws), "src.md".into(), "dst.md".into()).unwrap();
        assert!(!ws.join("src.md").exists());
        let content = fs::read_to_string(ws.join("dst.md")).unwrap();
        assert_eq!(content, "content");
    }

    #[test]
    fn file_move_succeeds_for_folder() {
        let ws = temp_workspace();
        fs::create_dir_all(ws.join("folder")).unwrap();
        fs::write(ws.join("folder/nested.md"), "nested").unwrap();
        file_move(ws_root(&ws), "folder".into(), "renamed".into()).unwrap();
        assert!(!ws.join("folder").exists());
        assert!(ws.join("renamed").exists());
        assert!(ws.join("renamed/nested.md").exists());
        let content = fs::read_to_string(ws.join("renamed/nested.md")).unwrap();
        assert_eq!(content, "nested");
    }

    #[test]
    fn file_move_rejects_existing_destination() {
        let ws = temp_workspace();
        file_create_markdown(ws_root(&ws), "src.md".into(), "src content".into()).unwrap();
        file_create_markdown(ws_root(&ws), "dst.md".into(), "dst content".into()).unwrap();
        let err = file_move(ws_root(&ws), "src.md".into(), "dst.md".into()).unwrap_err();
        assert_eq!(err, "Destination already exists");
        let src_content = fs::read_to_string(ws.join("src.md")).unwrap();
        let dst_content = fs::read_to_string(ws.join("dst.md")).unwrap();
        assert_eq!(src_content, "src content");
        assert_eq!(dst_content, "dst content");
    }

    #[test]
    fn file_move_rejects_folder_into_itself() {
        let ws = temp_workspace();
        fs::create_dir_all(ws.join("folder")).unwrap();
        let err = file_move(ws_root(&ws), "folder".into(), "folder".into()).unwrap_err();
        assert_eq!(err, "A folder cannot be moved into itself or one of its subfolders");
        assert!(ws.join("folder").exists());
    }

    #[test]
    fn file_move_rejects_folder_into_subfolder() {
        let ws = temp_workspace();
        fs::create_dir_all(ws.join("folder/sub")).unwrap();
        let err = file_move(ws_root(&ws), "folder".into(), "folder/sub".into()).unwrap_err();
        assert_eq!(err, "A folder cannot be moved into itself or one of its subfolders");
        assert!(ws.join("folder").exists());
        assert!(ws.join("folder/sub").exists());
    }

    #[test]
    fn file_move_rejects_folder_into_nested_descendant() {
        let ws = temp_workspace();
        fs::create_dir_all(ws.join("folder/a/b/c")).unwrap();
        let err = file_move(ws_root(&ws), "folder".into(), "folder/a/b/c".into()).unwrap_err();
        assert_eq!(err, "A folder cannot be moved into itself or one of its subfolders");
        assert!(ws.join("folder").exists());
    }

    #[test]
    fn file_delete_moves_file_to_trash() {
        let ws = temp_workspace();
        file_create_markdown(ws_root(&ws), "note.md".into(), "deleted content".into()).unwrap();
        let trash_path = file_delete(ws_root(&ws), "note.md".into()).unwrap();
        assert!(!ws.join("note.md").exists());
        assert!(ws.join(&trash_path).exists());
        let content = fs::read_to_string(ws.join(&trash_path)).unwrap();
        assert_eq!(content, "deleted content");
        assert!(trash_path.starts_with(".marnote-trash/"));
        assert!(trash_path.contains("note.md"));
    }

    #[test]
    fn file_delete_trash_name_uses_underscores_for_separators() {
        let ws = temp_workspace();
        fs::create_dir_all(ws.join("folder/sub")).unwrap();
        file_create_markdown(ws_root(&ws), "folder/sub/deep.md".into(), "deep content".into()).unwrap();
        let trash_path = file_delete(ws_root(&ws), "folder/sub/deep.md".into()).unwrap();
        assert!(!ws.join("folder/sub/deep.md").exists());
        assert!(ws.join(&trash_path).exists());
        assert!(trash_path.contains("folder_sub_deep.md"));
    }

    #[test]
    fn file_delete_creates_trash_directory() {
        let ws = temp_workspace();
        file_create_markdown(ws_root(&ws), "note.md".into(), "content".into()).unwrap();
        file_delete(ws_root(&ws), "note.md".into()).unwrap();
        assert!(ws.join(".marnote-trash").exists());
        assert!(ws.join(".marnote-trash").is_dir());
    }
}
