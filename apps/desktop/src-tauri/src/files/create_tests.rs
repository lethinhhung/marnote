use super::file_create_markdown;
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> PathBuf {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let path = std::env::temp_dir().join(format!("marnote-create-collision-{id}"));
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
fn creation_preserves_existing_file_and_uses_available_name() {
    let ws = workspace();
    fs::write(ws.join("note.md"), "original").unwrap();

    let created = file_create_markdown(root(&ws), "note.md".into(), "new content".into()).unwrap();

    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "original");
    assert_eq!(created, "note-1.md");
    assert_eq!(
        fs::read_to_string(ws.join(&created)).unwrap(),
        "new content"
    );
}

#[test]
fn creation_returns_path_and_writes_new_markdown_content() {
    let ws = workspace();

    let created = file_create_markdown(root(&ws), "fresh-note.md".into(), "# Fresh note\n\nBody".into())
        .unwrap();

    assert_eq!(created, "fresh-note.md");
    assert_eq!(
        fs::read_to_string(ws.join(&created)).unwrap(),
        "# Fresh note\n\nBody"
    );
}
