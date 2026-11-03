use super::read_markdown;
use std::{fs, path::PathBuf};

fn temp_workspace() -> PathBuf {
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let path = std::env::temp_dir().join(format!("marnote-read-{}-{unique}", std::process::id()));
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
        assert!(
            read_markdown(&root(&ws), path).is_err(),
            "accepted {path:?}"
        );
    }

    fs::remove_dir_all(ws).unwrap();
}

#[cfg(unix)]
#[test]
fn read_rejects_symlink_to_file_outside_workspace() {
    let ws = temp_workspace();
    let outside = std::env::temp_dir().join(format!("marnote-outside-read-{}", std::process::id()));
    fs::write(&outside, "# Secret\noutside content").unwrap();

    std::os::unix::fs::symlink(&outside, ws.join("linked.md")).unwrap();

    assert!(read_markdown(&root(&ws), "linked.md").is_err());
    assert_eq!(
        fs::read_to_string(&outside).unwrap(),
        "# Secret\noutside content"
    );
    assert!(ws.join("linked.md").symlink_metadata().is_ok());

    fs::remove_dir_all(ws).unwrap();
    fs::remove_file(outside).unwrap();
}

#[cfg(unix)]
#[test]
fn read_rejects_symlink_to_folder_outside_workspace() {
    let ws = temp_workspace();
    let outside_dir =
        std::env::temp_dir().join(format!("marnote-outside-read-dir-{}", std::process::id()));
    let _ = fs::remove_dir_all(&outside_dir);
    fs::create_dir_all(outside_dir.join("secret_folder")).unwrap();
    fs::write(
        outside_dir.join("secret_folder/note.md"),
        "# Secret\noutside content",
    )
    .unwrap();
    std::os::unix::fs::symlink(&outside_dir.join("secret_folder"), ws.join("linked_folder"))
        .unwrap();

    assert!(read_markdown(&root(&ws), "linked_folder/note.md").is_err());
    assert!(outside_dir.join("secret_folder").exists());
    assert!(outside_dir.join("secret_folder/note.md").exists());
    assert_eq!(
        fs::read_to_string(outside_dir.join("secret_folder/note.md")).unwrap(),
        "# Secret\noutside content"
    );
    assert!(ws.join("linked_folder").symlink_metadata().is_ok());

    fs::remove_dir_all(ws).unwrap();
    fs::remove_dir_all(outside_dir).unwrap();
}
