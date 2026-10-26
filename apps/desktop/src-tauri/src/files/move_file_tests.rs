use super::{file_create_markdown, file_move};
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> PathBuf {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let path = std::env::temp_dir().join(format!("marnote-move-test-{id}"));
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
fn move_rejects_when_destination_file_exists() {
    let ws = workspace();
    file_create_markdown(root(&ws), "source.md".into(), "source content".into()).unwrap();
    file_create_markdown(root(&ws), "dest.md".into(), "dest content".into()).unwrap();

    let result = file_move(root(&ws), "source.md".into(), "dest.md".into());

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Destination already exists");

    let source_content = fs::read_to_string(ws.join("source.md")).unwrap();
    let dest_content = fs::read_to_string(ws.join("dest.md")).unwrap();
    assert_eq!(source_content, "source content");
    assert_eq!(dest_content, "dest content");
}

#[test]
fn move_rejects_when_destination_folder_exists() {
    let ws = workspace();
    fs::create_dir_all(ws.join("source_folder")).unwrap();
    file_create_markdown(root(&ws), "source_folder/note.md".into(), "source note".into()).unwrap();
    fs::create_dir_all(ws.join("dest_folder")).unwrap();
    file_create_markdown(root(&ws), "dest_folder/note.md".into(), "dest note".into()).unwrap();

    let result = file_move(root(&ws), "source_folder".into(), "dest_folder".into());

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Destination already exists");

    let source_note = fs::read_to_string(ws.join("source_folder/note.md")).unwrap();
    let dest_note = fs::read_to_string(ws.join("dest_folder/note.md")).unwrap();
    assert_eq!(source_note, "source note");
    assert_eq!(dest_note, "dest note");
}

#[test]
fn move_rejects_when_destination_file_conflicts_with_folder_move() {
    let ws = workspace();
    fs::create_dir_all(ws.join("source_folder")).unwrap();
    file_create_markdown(root(&ws), "source_folder/note.md".into(), "source note".into()).unwrap();
    file_create_markdown(root(&ws), "conflict.md".into(), "file content".into()).unwrap();

    let result = file_move(root(&ws), "source_folder".into(), "conflict.md".into());

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Destination already exists");

    let source_note = fs::read_to_string(ws.join("source_folder/note.md")).unwrap();
    let conflict_content = fs::read_to_string(ws.join("conflict.md")).unwrap();
    assert_eq!(source_note, "source note");
    assert_eq!(conflict_content, "file content");
}

#[test]
fn move_file_preserves_content_at_destination() {
    let ws = workspace();
    file_create_markdown(root(&ws), "source.md".into(), "file content".into()).unwrap();

    file_move(root(&ws), "source.md".into(), "renamed.md".into()).unwrap();

    assert!(!ws.join("source.md").exists());
    assert_eq!(fs::read_to_string(ws.join("renamed.md")).unwrap(), "file content");
}

#[test]
fn move_folder_preserves_files_at_destination() {
    let ws = workspace();
    fs::create_dir_all(ws.join("source_folder/nested")).unwrap();
    file_create_markdown(
        root(&ws),
        "source_folder/nested/note.md".into(),
        "nested content".into(),
    )
    .unwrap();

    file_move(root(&ws), "source_folder".into(), "renamed_folder".into()).unwrap();

    assert!(!ws.join("source_folder").exists());
    assert_eq!(
        fs::read_to_string(ws.join("renamed_folder/nested/note.md")).unwrap(),
        "nested content"
    );
}

#[test]
fn moving_file_to_itself_is_a_no_op() {
    let ws = workspace();
    file_create_markdown(root(&ws), "same.md".into(), "unchanged content".into()).unwrap();

    file_move(root(&ws), "same.md".into(), "same.md".into()).unwrap();

    assert_eq!(fs::read_to_string(ws.join("same.md")).unwrap(), "unchanged content");
}
