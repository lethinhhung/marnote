use super::update::update_markdown;
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> (PathBuf, PathBuf) {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let root = std::env::temp_dir().join(format!("marnote-update-safety-{id}"));
    let outside = std::env::temp_dir().join(format!("marnote-outside-update-{id}.md"));
    if root.exists() {
        fs::remove_dir_all(&root).unwrap();
    }
    let _ = fs::remove_file(&outside);
    fs::create_dir_all(&root).unwrap();
    fs::write(&outside, "keep me").unwrap();
    (root, outside)
}

#[test]
fn update_rejects_external_change_and_preserves_content() {
    let ws = workspace();
    let note = ws.0.join("note.md");
    fs::write(&note, "external content").unwrap();

    let result = update_markdown(
        &ws.0.to_string_lossy(),
        "note.md",
        "replacement content",
        "expected previous content",
    );

    assert!(result.is_err());
    assert_eq!(fs::read_to_string(note).unwrap(), "external content");
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn update_succeeds_when_expected_content_matches() {
    let ws = workspace();
    let note = ws.0.join("note.md");
    fs::write(&note, "original content").unwrap();

    let result = update_markdown(
        &ws.0.to_string_lossy(),
        "note.md",
        "updated content",
        "original content",
    );

    assert!(result.is_ok());
    assert_eq!(fs::read_to_string(&note).unwrap(), "updated content");
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn update_rejects_empty_and_parent_traversal_paths() {
    let (ws, outside) = workspace();
    fs::write(ws.join("note.md"), "content").unwrap();

    assert!(update_markdown(&ws.to_string_lossy(), "", "new", "content").is_err());
    let outside_path = format!("../{}", outside.file_name().unwrap().to_string_lossy());
    assert!(update_markdown(&ws.to_string_lossy(), &outside_path, "new", "content").is_err());
    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "content");
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn update_rejects_absolute_and_relative_paths() {
    let (ws, outside) = workspace();
    fs::write(ws.join("note.md"), "content").unwrap();

    assert!(update_markdown(&ws.to_string_lossy(), "/absolute/path.md", "new", "content").is_err());
    assert!(update_markdown(&ws.to_string_lossy(), "./relative.md", "new", "content").is_err());
    assert!(update_markdown(&ws.to_string_lossy(), "a/../../b.md", "new", "content").is_err());
    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "content");
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[cfg(unix)]
#[test]
fn update_rejects_symlink_to_file_outside_workspace() {
    let (ws, outside) = workspace();
    fs::write(ws.join("note.md"), "content").unwrap();
    std::os::unix::fs::symlink(&outside, ws.join("linked.md")).unwrap();

    assert!(update_markdown(&ws.to_string_lossy(), "linked.md", "new", "content").is_err());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    assert!(ws.join("linked.md").symlink_metadata().is_ok());

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[cfg(unix)]
#[test]
fn update_rejects_symlink_to_folder_outside_workspace() {
    let (ws, outside_file) = workspace();
    let outside_dir =
        std::env::temp_dir().join(format!("marnote-outside-update-dir-{}", std::process::id()));
    let _ = fs::remove_dir_all(&outside_dir);
    fs::create_dir_all(outside_dir.join("secret_folder")).unwrap();
    fs::write(outside_dir.join("secret_folder/note.md"), "secret content").unwrap();
    std::os::unix::fs::symlink(&outside_dir.join("secret_folder"), ws.join("linked_folder"))
        .unwrap();

    assert!(update_markdown(
        &ws.to_string_lossy(),
        "linked_folder/note.md",
        "new",
        "secret content"
    )
    .is_err());
    assert!(outside_dir.join("secret_folder").exists());
    assert!(outside_dir.join("secret_folder/note.md").exists());
    assert_eq!(
        fs::read_to_string(outside_dir.join("secret_folder/note.md")).unwrap(),
        "secret content"
    );
    assert!(ws.join("linked_folder").symlink_metadata().is_ok());

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside_file).unwrap();
    fs::remove_dir_all(outside_dir).unwrap();
}
