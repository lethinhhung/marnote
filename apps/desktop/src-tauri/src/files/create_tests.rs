use super::file_create_markdown;
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> (PathBuf, PathBuf) {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let root = std::env::temp_dir().join(format!("marnote-create-safety-{id}"));
    let outside = std::env::temp_dir().join(format!("marnote-outside-create-{id}.md"));
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
fn creation_preserves_existing_file_and_uses_available_name() {
    let ws = workspace();
    fs::write(ws.0.join("note.md"), "original").unwrap();

    let created =
        file_create_markdown(root(&ws.0), "note.md".into(), "new content".into()).unwrap();

    assert_eq!(
        fs::read_to_string(ws.0.join("note.md")).unwrap(),
        "original"
    );
    assert_eq!(created, "note-1.md");
    assert_eq!(
        fs::read_to_string(ws.0.join(&created)).unwrap(),
        "new content"
    );
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn creation_returns_path_and_writes_new_markdown_content() {
    let ws = workspace();

    let created = file_create_markdown(
        root(&ws.0),
        "fresh-note.md".into(),
        "# Fresh note\n\nBody".into(),
    )
    .unwrap();

    assert_eq!(created, "fresh-note.md");
    assert_eq!(
        fs::read_to_string(ws.0.join(&created)).unwrap(),
        "# Fresh note\n\nBody"
    );
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn creation_rejects_empty_and_parent_traversal_paths() {
    let (ws, outside) = workspace();
    fs::write(ws.join("note.md"), "inside").unwrap();

    assert!(file_create_markdown(root(&ws), "".into(), "content".into()).is_err());
    let outside_path = format!("../{}", outside.file_name().unwrap().to_string_lossy());
    assert!(file_create_markdown(root(&ws), outside_path, "content".into()).is_err());
    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "inside");
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn creation_rejects_absolute_and_relative_paths() {
    let (ws, outside) = workspace();
    fs::write(ws.join("note.md"), "inside").unwrap();

    assert!(file_create_markdown(root(&ws), "/absolute/path.md".into(), "content".into()).is_err());
    assert!(file_create_markdown(root(&ws), "./relative.md".into(), "content".into()).is_err());
    assert!(file_create_markdown(root(&ws), "a/../../b.md".into(), "content".into()).is_err());
    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "inside");
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[cfg(unix)]
#[test]
fn creation_does_not_follow_symlink_to_file_outside_workspace() {
    let (ws, outside) = workspace();
    std::os::unix::fs::symlink(&outside, ws.join("linked.md")).unwrap();

    let created = file_create_markdown(root(&ws), "linked.md".into(), "content".into()).unwrap();

    assert_ne!(created, "linked.md");
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    assert!(ws.join("linked.md").symlink_metadata().is_ok());
    assert!(ws.join(&created).exists());
    assert_eq!(fs::read_to_string(ws.join(&created)).unwrap(), "content");

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}
