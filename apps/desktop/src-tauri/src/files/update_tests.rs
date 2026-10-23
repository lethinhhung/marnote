use super::update::update_markdown;
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> PathBuf {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let path = std::env::temp_dir().join(format!("marnote-update-{id}"));
    if path.exists() {
        fs::remove_dir_all(&path).unwrap();
    }
    fs::create_dir_all(&path).unwrap();
    path
}

#[test]
fn update_rejects_external_change_and_preserves_content() {
    let ws = workspace();
    let note = ws.join("note.md");
    fs::write(&note, "external content").unwrap();

    let result = update_markdown(
        &ws.to_string_lossy(),
        "note.md",
        "replacement content",
        "expected previous content",
    );

    assert!(result.is_err());
    assert_eq!(fs::read_to_string(note).unwrap(), "external content");
    fs::remove_dir_all(ws).unwrap();
}

#[test]
fn update_succeeds_when_expected_content_matches() {
    let ws = workspace();
    let note = ws.join("note.md");
    fs::write(&note, "original content").unwrap();

    let result = update_markdown(
        &ws.to_string_lossy(),
        "note.md",
        "updated content",
        "original content",
    );

    assert!(result.is_ok());
    assert_eq!(fs::read_to_string(&note).unwrap(), "updated content");
    fs::remove_dir_all(ws).unwrap();
}
