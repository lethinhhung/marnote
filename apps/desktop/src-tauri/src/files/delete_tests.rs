use super::file_delete;
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> (PathBuf, PathBuf) {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let root = std::env::temp_dir().join(format!("marnote-delete-{id}"));
    let outside = std::env::temp_dir().join(format!("marnote-outside-{id}.md"));
    if root.exists() {
        fs::remove_dir_all(&root).unwrap();
    }
    let _ = fs::remove_file(&outside);
    fs::create_dir_all(&root).unwrap();
    fs::write(&outside, "keep me").unwrap();
    (root, outside)
}

fn root(path: &PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

#[test]
fn delete_rejects_empty_and_parent_traversal_paths() {
    let (ws, outside) = workspace();
    fs::write(ws.join("note.md"), "inside").unwrap();

    assert!(file_delete(root(&ws), "".into()).is_err());
    let outside_path = format!("../{}", outside.file_name().unwrap().to_string_lossy());
    assert!(file_delete(root(&ws), outside_path).is_err());
    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "inside");
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[cfg(unix)]
#[test]
fn delete_rejects_symlink_to_file_outside_workspace() {
    let (ws, outside) = workspace();
    std::os::unix::fs::symlink(&outside, ws.join("linked.md")).unwrap();

    assert!(file_delete(root(&ws), "linked.md".into()).is_err());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    assert!(ws.join("linked.md").symlink_metadata().is_ok());

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn delete_file_success_removes_requested_file() {
    let (ws, outside) = workspace();
    let file_path = ws.join("note.md");
    fs::write(&file_path, "content to delete").unwrap();
    fs::write(ws.join("other.md"), "keep this").unwrap();

    let result = file_delete(root(&ws), "note.md".into());
    assert!(result.is_ok(), "delete should succeed: {:?}", result.err());

    assert!(!file_path.exists(), "deleted file should not exist");
    assert_eq!(
        fs::read_to_string(ws.join("other.md")).unwrap(),
        "keep this",
        "unrelated file should remain"
    );
    assert_eq!(
        fs::read_to_string(&outside).unwrap(),
        "keep me",
        "outside file should remain"
    );

    let trash_dir = ws.join(".marnote-trash");
    assert!(trash_dir.exists(), "trash directory should exist");
    let trash_entries: Vec<_> = fs::read_dir(&trash_dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name() != "index.json")
        .collect();
    assert_eq!(trash_entries.len(), 1, "trash should have one entry");

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn delete_folder_success_removes_requested_folder_and_contents() {
    let (ws, outside) = workspace();
    fs::create_dir_all(ws.join("folder/sub")).unwrap();
    fs::write(ws.join("folder/file1.md"), "inside folder").unwrap();
    fs::write(ws.join("folder/sub/file2.md"), "nested").unwrap();
    fs::write(ws.join("other.md"), "keep this").unwrap();

    let result = file_delete(root(&ws), "folder".into());
    assert!(result.is_ok(), "delete should succeed: {:?}", result.err());

    assert!(!ws.join("folder").exists(), "deleted folder should not exist");
    assert!(!ws.join("folder/file1.md").exists(), "nested file should not exist");
    assert!(!ws.join("folder/sub/file2.md").exists(), "deeply nested file should not exist");
    assert_eq!(
        fs::read_to_string(ws.join("other.md")).unwrap(),
        "keep this",
        "unrelated file should remain"
    );
    assert_eq!(
        fs::read_to_string(&outside).unwrap(),
        "keep me",
        "outside file should remain"
    );

    let trash_dir = ws.join(".marnote-trash");
    assert!(trash_dir.exists(), "trash directory should exist");
    let trash_entries: Vec<_> = fs::read_dir(&trash_dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name() != "index.json")
        .collect();
    assert_eq!(trash_entries.len(), 1, "trash should have one entry for the folder");

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}
