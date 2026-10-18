use super::{file_create_markdown, file_delete, file_move, file_update_markdown};
use crate::metadata;
use std::{fs, path::PathBuf, sync::atomic::{AtomicU64, Ordering}};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> PathBuf {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let path = std::env::temp_dir().join(format!("marnote-lifecycle-{id}"));
    if path.exists() {
        fs::remove_dir_all(&path).unwrap();
    }
    fs::create_dir_all(&path).unwrap();
    path
}

fn root(path: &PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

#[test]
fn create_and_update_keep_metadata_lifecycle() {
    let ws = workspace();
    file_create_markdown(root(&ws), "note.md".into(), "one".into()).unwrap();
    let before = metadata::read_metadata(&ws).unwrap();
    let created = before.entries["note.md"].created_ms();
    file_update_markdown(root(&ws), "note.md".into(), "two".into(), "one".into()).unwrap();
    let after = metadata::read_metadata(&ws).unwrap();
    assert_eq!(after.entries["note.md"].created_ms(), created);
    assert!(after.entries["note.md"].updated_ms() >= before.entries["note.md"].updated_ms());
}

#[test]
fn moving_and_deleting_folder_metadata_rebases_then_removes_descendants() {
    let ws = workspace();
    fs::create_dir_all(ws.join("old/nested")).unwrap();
    file_create_markdown(root(&ws), "old/nested/note.md".into(), "text".into()).unwrap();
    file_move(root(&ws), "old".into(), "new".into()).unwrap();
    let moved = metadata::read_metadata(&ws).unwrap();
    assert!(moved.entries.contains_key("new/nested/note.md"));
    assert!(!moved.entries.contains_key("old/nested/note.md"));
    file_delete(root(&ws), "new".into()).unwrap();
    assert!(metadata::read_metadata(&ws).unwrap().entries.is_empty());
}

#[test]
fn rebase_changes_only_matching_path_prefixes() {
    let store = metadata::WorkspaceMetadata {
        entries: [("old/a.md".into(), metadata::EntryMetadata::default()),
            ("older/a.md".into(), metadata::EntryMetadata::default())].into(),
    };
    let result = super::metadata_paths::rebase_metadata_paths(&store, "old", "new");
    assert!(result.contains_key("new/a.md"));
    assert!(result.contains_key("older/a.md"));
}

#[test]
fn delete_filter_removes_exact_path_and_descendants() {
    let store = metadata::WorkspaceMetadata {
        entries: [("folder".into(), metadata::EntryMetadata::default()),
            ("folder/note.md".into(), metadata::EntryMetadata::default()),
            ("folderish/note.md".into(), metadata::EntryMetadata::default())].into(),
    };
    let result = super::metadata_paths::filter_metadata_for_delete(&store, "folder");
    assert_eq!(result.len(), 1);
    assert!(result.contains_key("folderish/note.md"));
}
