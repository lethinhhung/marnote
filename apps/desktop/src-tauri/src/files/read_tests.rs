use super::read_markdown;
use std::{fs, path::PathBuf};

fn temp_workspace() -> PathBuf {
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let path = std::env::temp_dir().join(format!(
        "marnote-read-{}-{unique}",
        std::process::id()
    ));
    fs::create_dir_all(&path).unwrap();
    path
}

fn root(path: &PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

#[test]
fn reads_markdown_contents() {
    let ws = temp_workspace();
    fs::write(ws.join("note.md"), "# Hello\ncontent").unwrap();

    let document = read_markdown(&root(&ws), "note.md").unwrap();

    let value = serde_json::to_value(document).unwrap();
    assert_eq!(value["path"], "note.md");
    assert_eq!(value["content"], "# Hello\ncontent");
    fs::remove_dir_all(ws).unwrap();
}

#[test]
fn rejects_invalid_and_out_of_workspace_paths() {
    let ws = temp_workspace();
    fs::write(ws.join("note.txt"), "not markdown").unwrap();

    for path in ["", "../outside.md", "note.txt", "missing.md"] {
        assert!(read_markdown(&root(&ws), path).is_err(), "accepted {path:?}");
    }

    fs::remove_dir_all(ws).unwrap();
}
