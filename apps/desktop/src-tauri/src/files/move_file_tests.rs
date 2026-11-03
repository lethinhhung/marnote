use super::{file_create_markdown, file_move};
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> (PathBuf, PathBuf) {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let root = std::env::temp_dir().join(format!("marnote-move-safety-{id}"));
    let outside = std::env::temp_dir().join(format!("marnote-outside-move-{id}.md"));
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
fn move_rejects_when_destination_file_exists() {
    let ws = workspace();
    file_create_markdown(root(&ws.0), "source.md".into(), "source content".into()).unwrap();
    file_create_markdown(root(&ws.0), "dest.md".into(), "dest content".into()).unwrap();

    let result = file_move(root(&ws.0), "source.md".into(), "dest.md".into());

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Destination already exists");

    let source_content = fs::read_to_string(ws.0.join("source.md")).unwrap();
    let dest_content = fs::read_to_string(ws.0.join("dest.md")).unwrap();
    assert_eq!(source_content, "source content");
    assert_eq!(dest_content, "dest content");
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn move_rejects_when_destination_folder_exists() {
    let ws = workspace();
    fs::create_dir_all(ws.0.join("source_folder")).unwrap();
    file_create_markdown(
        root(&ws.0),
        "source_folder/note.md".into(),
        "source note".into(),
    )
    .unwrap();
    fs::create_dir_all(ws.0.join("dest_folder")).unwrap();
    file_create_markdown(
        root(&ws.0),
        "dest_folder/note.md".into(),
        "dest note".into(),
    )
    .unwrap();

    let result = file_move(root(&ws.0), "source_folder".into(), "dest_folder".into());

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Destination already exists");

    let source_note = fs::read_to_string(ws.0.join("source_folder/note.md")).unwrap();
    let dest_note = fs::read_to_string(ws.0.join("dest_folder/note.md")).unwrap();
    assert_eq!(source_note, "source note");
    assert_eq!(dest_note, "dest note");
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn move_rejects_when_destination_file_conflicts_with_folder_move() {
    let ws = workspace();
    fs::create_dir_all(ws.0.join("source_folder")).unwrap();
    file_create_markdown(
        root(&ws.0),
        "source_folder/note.md".into(),
        "source note".into(),
    )
    .unwrap();
    file_create_markdown(root(&ws.0), "conflict.md".into(), "file content".into()).unwrap();

    let result = file_move(root(&ws.0), "source_folder".into(), "conflict.md".into());

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Destination already exists");

    let source_note = fs::read_to_string(ws.0.join("source_folder/note.md")).unwrap();
    let conflict_content = fs::read_to_string(ws.0.join("conflict.md")).unwrap();
    assert_eq!(source_note, "source note");
    assert_eq!(conflict_content, "file content");
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn move_file_preserves_content_at_destination() {
    let ws = workspace();
    file_create_markdown(root(&ws.0), "source.md".into(), "file content".into()).unwrap();

    file_move(root(&ws.0), "source.md".into(), "renamed.md".into()).unwrap();

    assert!(!ws.0.join("source.md").exists());
    assert_eq!(
        fs::read_to_string(ws.0.join("renamed.md")).unwrap(),
        "file content"
    );
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn move_folder_preserves_files_at_destination() {
    let ws = workspace();
    fs::create_dir_all(ws.0.join("source_folder/nested")).unwrap();
    file_create_markdown(
        root(&ws.0),
        "source_folder/nested/note.md".into(),
        "nested content".into(),
    )
    .unwrap();

    file_move(root(&ws.0), "source_folder".into(), "renamed_folder".into()).unwrap();

    assert!(!ws.0.join("source_folder").exists());
    assert_eq!(
        fs::read_to_string(ws.0.join("renamed_folder/nested/note.md")).unwrap(),
        "nested content"
    );
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn moving_file_to_itself_is_a_no_op() {
    let ws = workspace();
    file_create_markdown(root(&ws.0), "same.md".into(), "unchanged content".into()).unwrap();

    file_move(root(&ws.0), "same.md".into(), "same.md".into()).unwrap();

    assert_eq!(
        fs::read_to_string(ws.0.join("same.md")).unwrap(),
        "unchanged content"
    );
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn move_rejects_folder_into_itself() {
    let ws = workspace();
    fs::create_dir_all(ws.0.join("folder/nested")).unwrap();
    file_create_markdown(
        root(&ws.0),
        "folder/nested/note.md".into(),
        "nested content".into(),
    )
    .unwrap();

    let result = file_move(root(&ws.0), "folder".into(), "folder".into());

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "A folder cannot be moved into itself or one of its subfolders"
    );

    assert!(ws.0.join("folder").exists());
    assert!(ws.0.join("folder/nested").exists());
    assert_eq!(
        fs::read_to_string(ws.0.join("folder/nested/note.md")).unwrap(),
        "nested content"
    );
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn move_rejects_folder_into_descendant() {
    let ws = workspace();
    fs::create_dir_all(ws.0.join("folder/nested")).unwrap();
    file_create_markdown(
        root(&ws.0),
        "folder/nested/note.md".into(),
        "nested content".into(),
    )
    .unwrap();

    let result = file_move(root(&ws.0), "folder".into(), "folder/nested".into());

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "A folder cannot be moved into itself or one of its subfolders"
    );

    assert!(ws.0.join("folder").exists());
    assert!(ws.0.join("folder/nested").exists());
    assert_eq!(
        fs::read_to_string(ws.0.join("folder/nested/note.md")).unwrap(),
        "nested content"
    );
    fs::remove_dir_all(ws.0).unwrap();
    fs::remove_file(ws.1).unwrap();
}

#[test]
fn move_rejects_empty_and_parent_traversal_paths() {
    let (ws, outside) = workspace();
    file_create_markdown(root(&ws), "source.md".into(), "content".into()).unwrap();

    assert!(file_move(root(&ws), "".into(), "dest.md".into()).is_err());
    assert!(file_move(root(&ws), "source.md".into(), "".into()).is_err());
    let outside_path = format!("../{}", outside.file_name().unwrap().to_string_lossy());
    assert!(file_move(root(&ws), "source.md".into(), outside_path.clone()).is_err());
    assert!(file_move(root(&ws), outside_path, "dest.md".into()).is_err());
    assert!(ws.join("source.md").exists());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[test]
fn move_rejects_absolute_and_relative_paths() {
    let (ws, outside) = workspace();
    file_create_markdown(root(&ws), "source.md".into(), "content".into()).unwrap();

    assert!(file_move(root(&ws), "/absolute/source.md".into(), "dest.md".into()).is_err());
    assert!(file_move(root(&ws), "source.md".into(), "/absolute/dest.md".into()).is_err());
    assert!(file_move(root(&ws), "./relative.md".into(), "dest.md".into()).is_err());
    assert!(file_move(root(&ws), "source.md".into(), "./relative.md".into()).is_err());
    assert!(file_move(root(&ws), "a/../../b.md".into(), "dest.md".into()).is_err());
    assert!(file_move(root(&ws), "source.md".into(), "a/../../b.md".into()).is_err());
    assert!(ws.join("source.md").exists());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[cfg(unix)]
#[test]
fn move_rejects_symlink_source_outside_workspace() {
    let (ws, outside) = workspace();
    fs::write(ws.join("source.md"), "content").unwrap();
    std::os::unix::fs::symlink(&outside, ws.join("linked.md")).unwrap();

    assert!(file_move(root(&ws), "linked.md".into(), "dest.md".into()).is_err());
    assert!(ws.join("source.md").exists());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    assert!(ws.join("linked.md").symlink_metadata().is_ok());

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[cfg(unix)]
#[test]
fn move_rejects_symlink_destination_outside_workspace() {
    let (ws, outside) = workspace();
    file_create_markdown(root(&ws), "source.md".into(), "content".to_string()).unwrap();
    std::os::unix::fs::symlink(&outside, ws.join("linked.md")).unwrap();

    assert!(file_move(root(&ws), "source.md".into(), "linked.md".into()).is_err());
    assert!(ws.join("source.md").exists());
    assert_eq!(fs::read_to_string(&outside).unwrap(), "keep me");
    assert!(ws.join("linked.md").symlink_metadata().is_ok());

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[cfg(unix)]
#[test]
fn move_rejects_symlink_source_folder_outside_workspace() {
    let (ws, outside_file) = workspace();
    let outside_dir = std::env::temp_dir().join(format!(
        "marnote-outside-move-src-dir-{}",
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&outside_dir);
    fs::create_dir_all(outside_dir.join("secret_folder")).unwrap();
    file_create_markdown(
        root(&outside_dir),
        "secret_folder/note.md".into(),
        "secret content".into(),
    )
    .unwrap();
    std::os::unix::fs::symlink(&outside_dir.join("secret_folder"), ws.join("linked_folder"))
        .unwrap();

    assert!(file_move(root(&ws), "linked_folder".into(), "dest_folder".into()).is_err());
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

#[cfg(unix)]
#[test]
fn move_rejects_symlink_destination_folder_outside_workspace() {
    let (ws, outside_file) = workspace();
    let outside_dir = std::env::temp_dir().join(format!(
        "marnote-outside-move-dst-dir-{}",
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&outside_dir);
    fs::create_dir_all(outside_dir.join("secret_folder")).unwrap();
    std::os::unix::fs::symlink(&outside_dir.join("secret_folder"), ws.join("linked_folder"))
        .unwrap();
    file_create_markdown(root(&ws), "source.md".into(), "content".into()).unwrap();

    assert!(file_move(
        root(&ws),
        "source.md".into(),
        "linked_folder/note.md".into()
    )
    .is_err());
    assert!(ws.join("source.md").exists());
    assert!(outside_dir.join("secret_folder").exists());
    assert!(ws.join("linked_folder").symlink_metadata().is_ok());

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside_file).unwrap();
    fs::remove_dir_all(outside_dir).unwrap();
}
