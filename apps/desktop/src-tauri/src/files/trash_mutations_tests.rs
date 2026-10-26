use super::{file_create_markdown, file_delete, file_empty_trash, file_restore_trash};
use crate::metadata;
use std::{fs, path::PathBuf, sync::atomic::{AtomicU64, Ordering}};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> PathBuf {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let path = std::env::temp_dir().join(format!("marnote-trash-mutations-{id}"));
    if path.exists() { fs::remove_dir_all(&path).unwrap(); }
    fs::create_dir_all(&path).unwrap();
    path
}

fn root(path: &PathBuf) -> String { path.to_string_lossy().into_owned() }

fn trashed_note(ws: &PathBuf) -> String {
    file_create_markdown(root(ws), "note.md".into(), "content".into()).unwrap();
    file_delete(root(ws), "note.md".into()).unwrap()
}

#[test]
fn invalid_restore_paths_fail_without_moving_trash_items() {
    let ws = workspace();
    let trash_path = trashed_note(&ws);
    for id in ["../outside", ".", "index.json"] {
        assert!(file_restore_trash(root(&ws), id.into()).is_err());
        assert!(ws.join(&trash_path).exists());
    }
    assert!(!ws.join("note.md").exists());
}

#[test]
fn restore_collision_preserves_workspace_and_trash_files() {
    let ws = workspace();
    let trash_path = trashed_note(&ws);
    fs::write(ws.join("note.md"), "existing").unwrap();
    assert!(file_restore_trash(root(&ws), "not-the-item".into()).is_err());
    let id = PathBuf::from(&trash_path).file_name().unwrap().to_string_lossy().into_owned();
    assert!(file_restore_trash(root(&ws), id).is_err());
    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "existing");
    assert!(ws.join(trash_path).exists());
}

#[test]
fn restore_returns_item_and_metadata_to_original_path() {
    let ws = workspace();
    file_create_markdown(root(&ws), "note.md".into(), "content".into()).unwrap();
    metadata::update_metadata(&ws, "note.md", metadata::EntryMetadata {
        tags: Some(vec!["work".into()]), icon: Some("star".into()), favorite: Some(true),
        created_ms: Some(123), updated_ms: Some(456),
    }).unwrap();
    let trash_path = file_delete(root(&ws), "note.md".into()).unwrap();
    let id = PathBuf::from(trash_path).file_name().unwrap().to_string_lossy().into_owned();
    file_restore_trash(root(&ws), id).unwrap();
    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "content");
    let restored = metadata::read_metadata(&ws).unwrap();
    let entry = &restored.entries["note.md"];
    assert_eq!(entry.tags(), &["work"]);
    assert_eq!(entry.icon(), Some("star"));
    assert!(entry.favorite());
    assert_eq!(entry.created_ms(), Some(123));
    assert_eq!(entry.updated_ms(), Some(456));
}

#[test]
fn empty_trash_permanently_removes_trashed_items() {
    let ws = workspace();
    let trash_path = trashed_note(&ws);
    file_empty_trash(root(&ws)).unwrap();
    assert!(!ws.join(trash_path).exists());
    assert!(super::file_list_trash(root(&ws)).unwrap().is_empty());
    assert!(!ws.join("note.md").exists());
}
