use super::{
    file_create_markdown, file_delete, file_empty_trash, file_list_trash, file_move,
    file_restore_trash,
};
use crate::metadata;
use crate::tree;
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};

static COUNTER: AtomicU64 = AtomicU64::new(0);

struct TempWorkspace {
    root: PathBuf,
    outside: PathBuf,
}

impl TempWorkspace {
    fn new(prefix: &str) -> Self {
        let id = COUNTER.fetch_add(1, Ordering::Relaxed);
        let root = std::env::temp_dir().join(format!("{prefix}-{id}"));
        let outside = std::env::temp_dir().join(format!("marnote-outside-{prefix}-{id}.md"));
        if root.exists() {
            fs::remove_dir_all(&root).unwrap();
        }
        let _ = fs::remove_file(&outside);
        fs::create_dir_all(&root).unwrap();
        fs::write(&outside, "keep me").unwrap();
        Self { root, outside }
    }

    fn root(&self) -> String {
        self.root.to_string_lossy().into_owned()
    }
}

impl Drop for TempWorkspace {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
        let _ = fs::remove_file(&self.outside);
    }
}

fn workspace() -> (PathBuf, PathBuf) {
    let ws = TempWorkspace::new("marnote-trash-safety");
    let root = ws.root.clone();
    let outside = ws.outside.clone();
    std::mem::forget(ws);
    (root, outside)
}

fn root(path: &PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

fn trashed_note(ws: &PathBuf) -> String {
    file_create_markdown(root(ws), "note.md".into(), "content".into()).unwrap();
    file_delete(root(ws), "note.md".into()).unwrap()
}

#[test]
fn invalid_restore_paths_fail_without_moving_trash_items() {
    let (ws, outside) = workspace();
    let trash_path = trashed_note(&ws);
    for id in ["../outside", ".", "index.json"] {
        assert!(file_restore_trash(root(&ws), id.into()).is_err());
        assert!(ws.join(&trash_path).exists());
    }
    assert!(!ws.join("note.md").exists());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn restore_rejects_traversal_and_absolute_paths() {
    let (ws, outside) = workspace();
    let trash_path = trashed_note(&ws);
    let outside_path = format!("../{}", outside.file_name().unwrap().to_string_lossy());

    assert!(file_restore_trash(root(&ws), outside_path).is_err());
    assert!(file_restore_trash(root(&ws), "/absolute/path".into()).is_err());
    assert!(file_restore_trash(root(&ws), "./relative".into()).is_err());
    assert!(file_restore_trash(root(&ws), "a/../../b".into()).is_err());

    assert!(ws.join(&trash_path).exists());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[cfg(unix)]
#[test]
fn restore_rejects_symlink_in_trash_destination() {
    let (ws, outside) = workspace();
    file_create_markdown(root(&ws), "note.md".into(), "content".into()).unwrap();
    let trash_path = file_delete(root(&ws), "note.md".into()).unwrap();
    let id = PathBuf::from(&trash_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .into_owned();

    // Create a symlink at the original location pointing outside
    std::os::unix::fs::symlink(&outside, ws.join("note.md")).unwrap();

    assert!(file_restore_trash(root(&ws), id).is_err());
    assert!(ws.join(trash_path).exists());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    assert!(ws.join("note.md").symlink_metadata().is_ok());

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn restore_collision_preserves_workspace_and_trash_files() {
    let (ws, outside) = workspace();
    let trash_path = trashed_note(&ws);
    fs::write(ws.join("note.md"), "existing").unwrap();
    assert!(file_restore_trash(root(&ws), "not-the-item".into()).is_err());
    let id = PathBuf::from(&trash_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .into_owned();
    assert!(file_restore_trash(root(&ws), id).is_err());
    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "existing");
    assert!(ws.join(trash_path).exists());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn restore_returns_item_and_metadata_to_original_path() {
    let (ws, outside) = workspace();
    file_create_markdown(root(&ws), "note.md".into(), "content".into()).unwrap();
    metadata::update_metadata(
        &ws,
        "note.md",
        metadata::EntryMetadata {
            tags: Some(vec!["work".into()]),
            icon: Some("star".into()),
            favorite: Some(true),
            created_ms: Some(123),
            updated_ms: Some(456),
        },
    )
    .unwrap();
    let trash_path = file_delete(root(&ws), "note.md".into()).unwrap();
    let id = PathBuf::from(trash_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .into_owned();
    file_restore_trash(root(&ws), id).unwrap();
    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "content");
    let restored = metadata::read_metadata(&ws).unwrap();
    let entry = &restored.entries["note.md"];
    assert_eq!(entry.tags(), &["work"]);
    assert_eq!(entry.icon(), Some("star"));
    assert!(entry.favorite());
    assert_eq!(entry.created_ms(), Some(123));
    assert_eq!(entry.updated_ms(), Some(456));
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn empty_trash_permanently_removes_trashed_items() {
    let (ws, outside) = workspace();
    let trash_path = trashed_note(&ws);
    file_empty_trash(root(&ws)).unwrap();
    assert!(!ws.join(trash_path).exists());
    assert!(super::file_list_trash(root(&ws)).unwrap().is_empty());
    assert!(!ws.join("note.md").exists());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn legacy_trash_item_restore_fails_without_moving_item() {
    let (ws, outside) = workspace();
    let trash = ws.join(".marnote-trash");
    fs::create_dir_all(&trash).unwrap();

    let legacy_file = trash.join("legacy-file.bin");
    fs::write(&legacy_file, b"legacy content").unwrap();

    assert!(file_restore_trash(root(&ws), "legacy-file.bin".into()).is_err());
    assert!(legacy_file.exists());
    assert!(!ws.join("legacy-file.bin").exists());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn empty_trash_removes_legacy_items_from_disk() {
    let (ws, outside) = workspace();
    let trash = ws.join(".marnote-trash");
    fs::create_dir_all(&trash).unwrap();

    let legacy_file = trash.join("legacy-file.bin");
    let legacy_dir = trash.join("legacy-dir");
    fs::write(&legacy_file, b"legacy content").unwrap();
    fs::create_dir_all(&legacy_dir).unwrap();
    fs::write(legacy_dir.join("nested.txt"), b"nested").unwrap();

    file_empty_trash(root(&ws)).unwrap();

    assert!(!legacy_file.exists());
    assert!(!legacy_dir.exists());
    assert!(super::file_list_trash(root(&ws)).unwrap().is_empty());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn workspace_note_lifecycle_create_move_trash_restore() {
    let ws = TempWorkspace::new("lifecycle");

    // Step 1: Create a note
    file_create_markdown(ws.root(), "note.md".into(), "original content".into()).unwrap();

    // Verify tree after creation
    let entries = tree::collect(&ws.root, &ws.root).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].name, "note.md");
    assert_eq!(entries[0].path, "note.md");
    assert_eq!(entries[0].kind, "file");
    assert_eq!(
        fs::read_to_string(ws.root.join("note.md")).unwrap(),
        "original content"
    );

    // Step 2: Move the note to a subfolder
    fs::create_dir_all(ws.root.join("folder")).unwrap();
    file_move(ws.root(), "note.md".into(), "folder/note.md".into()).unwrap();

    // Verify tree after move
    let entries = tree::collect(&ws.root, &ws.root).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].name, "folder");
    assert_eq!(entries[0].kind, "directory");
    assert_eq!(entries[0].children.len(), 1);
    assert_eq!(entries[0].children[0].name, "note.md");
    assert_eq!(entries[0].children[0].path, "folder/note.md");
    assert!(!ws.root.join("note.md").exists());
    assert_eq!(
        fs::read_to_string(ws.root.join("folder/note.md")).unwrap(),
        "original content"
    );

    // Step 3: Trash the moved note
    let trash_path = file_delete(ws.root(), "folder/note.md".into()).unwrap();

    // Verify tree after trash - note should be gone, folder still exists but empty
    let entries = tree::collect(&ws.root, &ws.root).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].name, "folder");
    assert_eq!(entries[0].kind, "directory");
    assert!(entries[0].children.is_empty());
    assert!(!ws.root.join("folder/note.md").exists());

    // Verify trash entry exists
    let trash_items = file_list_trash(ws.root()).unwrap();
    assert_eq!(trash_items.len(), 1);
    assert_eq!(trash_items[0].path, "folder/note.md");

    // Step 4: Restore the note
    let trash_id = PathBuf::from(&trash_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .into_owned();
    file_restore_trash(ws.root(), trash_id).unwrap();

    // Verify tree after restore - note back at original path
    let entries = tree::collect(&ws.root, &ws.root).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].name, "folder");
    assert_eq!(entries[0].kind, "directory");
    assert_eq!(entries[0].children.len(), 1);
    assert_eq!(entries[0].children[0].name, "note.md");
    assert_eq!(entries[0].children[0].path, "folder/note.md");
    assert_eq!(
        fs::read_to_string(ws.root.join("folder/note.md")).unwrap(),
        "original content"
    );

    // Verify trash entry is gone
    let trash_items = file_list_trash(ws.root()).unwrap();
    assert!(trash_items.is_empty());

    // Cleanup happens via Drop on ws
}
