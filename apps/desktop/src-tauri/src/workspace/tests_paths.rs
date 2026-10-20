use super::*;
use std::fs;
use std::path::Path;

fn assert_rejects_relative_path(ws: &Path, path: &str) {
    let result = target(ws, path, false);
    assert!(result.is_err(), "expected error for {path}");
    assert_eq!(result.unwrap_err(), "Path must be a non-empty workspace-relative path");
}

fn create_symlink(link: &Path, target_path: &Path) {
    #[cfg(unix)]
    std::os::unix::fs::symlink(target_path, link).unwrap();
    #[cfg(windows)]
    std::os::windows::fs::symlink_file(target_path, link).unwrap();
}

#[test]
fn root_valid_directory() {
    with_temp_workspace(|ws| {
        let result = root(&ws.to_string_lossy());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), fs::canonicalize(ws).unwrap());
    });
}

#[test]
fn root_rejects_non_directory() {
    with_temp_workspace(|ws| {
        let file = ws.join("not_a_dir.txt");
        fs::write(&file, b"content").unwrap();
        let result = root(&file.to_string_lossy());
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Workspace must be a directory");
    });
}

#[test]
fn root_rejects_nonexistent() {
    with_temp_workspace(|ws| assert!(root(&ws.join("does_not_exist").to_string_lossy()).is_err()));
}

#[test]
fn target_valid_relative_path() {
    with_temp_workspace(|ws| {
        fs::create_dir_all(ws.join("notes")).unwrap();
        let result = target(ws, "notes/file.md", false);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), ws.join("notes/file.md"));
    });
}

#[test]
fn target_rejects_empty_path() {
    with_temp_workspace(|ws| assert_rejects_relative_path(ws, ""));
}

#[test]
fn target_rejects_traversal_components() {
    with_temp_workspace(|ws| assert_rejects_relative_path(ws, "notes/../escape.md"));
}

#[test]
fn target_rejects_parent_escape_via_components() {
    with_temp_workspace(|ws| assert_rejects_relative_path(ws, "../outside.md"));
}

#[test]
fn target_rejects_absolute_path() {
    with_temp_workspace(|ws| assert_rejects_relative_path(ws, "/absolute/path.md"));
}

#[test]
fn target_rejects_dot_component() {
    with_temp_workspace(|ws| assert_rejects_relative_path(ws, "./relative.md"));
}

#[test]
fn target_rejects_multiple_dots() {
    with_temp_workspace(|ws| assert_rejects_relative_path(ws, "a/../../b.md"));
}

#[test]
fn target_allows_symlink_when_not_exists() {
    with_temp_workspace(|ws| assert!(target(ws, "new_link.md", false).is_ok()));
}

#[test]
fn target_rejects_symlink_when_exists() {
    with_temp_workspace(|ws| {
        let target_file = ws.join("real.md");
        fs::write(&target_file, b"content").unwrap();
        create_symlink(&ws.join("link.md"), &target_file);
        let result = target(ws, "link.md", true);
        assert!(result.is_err(), "expected error for symlink, got: {result:?}");
        assert_eq!(result.unwrap_err(), "Symlinks are not supported");
    });
}

#[test]
fn target_rejects_existing_symlink_escaping_workspace() {
    with_temp_workspace(|ws| {
        let outside_dir = std::env::temp_dir().join(format!("marnote_outside_{}", std::process::id()));
        fs::create_dir_all(&outside_dir).unwrap();
        let outside_canon = fs::canonicalize(&outside_dir).unwrap();
        let outside_file = outside_canon.join("secret.md");
        fs::write(&outside_file, b"secret").unwrap();
        create_symlink(&ws.join("escape.md"), &outside_file);
        let result = target(ws, "escape.md", true);
        assert!(result.is_err(), "expected error for escaping symlink, got: {result:?}");
        assert_eq!(result.unwrap_err(), "Symlinks are not supported");
        let _ = fs::remove_dir_all(&outside_dir);
    });
}
