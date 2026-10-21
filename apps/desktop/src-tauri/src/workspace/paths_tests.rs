use super::{root, target};
use std::fs;
use std::path::{Path, PathBuf};

fn temp_workspace() -> PathBuf {
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let path = std::env::temp_dir().join(format!("marnote-paths-{}-{unique}", std::process::id()));
    fs::create_dir_all(&path).unwrap();
    fs::canonicalize(&path).unwrap()
}

fn create_symlink(link: &Path, target_path: &Path) {
    #[cfg(unix)]
    std::os::unix::fs::symlink(target_path, link).unwrap();
    #[cfg(windows)]
    std::os::windows::fs::symlink_file(target_path, link).unwrap();
}

#[test]
fn root_accepts_directory() {
    let ws = temp_workspace();
    let resolved = root(&ws.to_string_lossy()).unwrap();
    assert_eq!(resolved, ws);
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn root_rejects_non_directory() {
    let ws = temp_workspace();
    let file = ws.join("not_a_dir.txt");
    fs::write(&file, b"content").unwrap();
    let result = root(&file.to_string_lossy());
    assert_eq!(result.unwrap_err(), "Workspace must be a directory");
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn root_rejects_nonexistent_path() {
    let ws = temp_workspace();
    let missing = ws.join("does_not_exist");
    assert!(root(&missing.to_string_lossy()).is_err());
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn target_accepts_workspace_relative_path() {
    let ws = temp_workspace();
    fs::create_dir_all(ws.join("notes")).unwrap();
    let resolved = target(&ws, "notes/file.md", false).unwrap();
    assert_eq!(resolved, ws.join("notes/file.md"));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn target_rejects_paths_outside_workspace() {
    let ws = temp_workspace();
    let invalid = [
        "",
        "notes/../escape.md",
        "../outside.md",
        "/absolute/path.md",
        "./relative.md",
        "a/../../b.md",
    ];
    for path in invalid {
        let result = target(&ws, path, false);
        assert_eq!(
            result.unwrap_err(),
            "Path must be a non-empty workspace-relative path"
        );
    }
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn target_rejects_symlink_when_path_exists() {
    let ws = temp_workspace();
    fs::write(ws.join("real.md"), b"content").unwrap();
    create_symlink(&ws.join("link.md"), &ws.join("real.md"));
    let result = target(&ws, "link.md", true);
    assert_eq!(result.unwrap_err(), "Symlinks are not supported");
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn target_rejects_symlink_escaping_workspace() {
    let ws = temp_workspace();
    let outside = temp_workspace();
    fs::write(outside.join("secret.md"), b"secret").unwrap();
    create_symlink(&ws.join("escape.md"), &outside.join("secret.md"));
    let result = target(&ws, "escape.md", true);
    assert_eq!(result.unwrap_err(), "Symlinks are not supported");
    fs::remove_dir_all(&ws).unwrap();
    fs::remove_dir_all(&outside).unwrap();
}

#[test]
fn target_allows_symlink_when_path_is_new() {
    let ws = temp_workspace();
    assert!(target(&ws, "new_link.md", false).is_ok());
    fs::remove_dir_all(&ws).unwrap();
}
