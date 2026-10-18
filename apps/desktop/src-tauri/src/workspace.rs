use crate::tree::collect;
use serde::Serialize;
use std::{
    fs,
    path::{Component, Path, PathBuf},
};
use tauri::Manager;

#[derive(Serialize)]
pub struct Entry {
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) kind: String,
    pub(crate) children: Vec<Entry>,
}
#[derive(Serialize)]
pub struct Workspace {
    name: String,
    path: String,
    entries: Vec<Entry>,
}

pub fn root(path: &str) -> Result<PathBuf, String> {
    let p = fs::canonicalize(path).map_err(|e| e.to_string())?;
    if !p.is_dir() {
        return Err("Workspace must be a directory".into());
    }
    Ok(p)
}
pub fn target(root: &Path, path: &str, exists: bool) -> Result<PathBuf, String> {
    let relative = Path::new(path);
    if relative.as_os_str().is_empty()
        || relative
            .components()
            .any(|c| !matches!(c, Component::Normal(_)))
    {
        return Err("Path must be a non-empty workspace-relative path".into());
    }
    let p = root.join(relative);
    let parent = fs::canonicalize(p.parent().ok_or("Invalid path")?).map_err(|e| e.to_string())?;
    if !parent.starts_with(root) {
        return Err("Path escapes workspace".into());
    }
    let p = parent.join(p.file_name().ok_or("Invalid path")?);
    if exists {
        if fs::symlink_metadata(&p)
            .map_err(|e| e.to_string())?
            .file_type()
            .is_symlink()
        {
            return Err("Symlinks are not supported".into());
        }
        if !fs::canonicalize(&p)
            .map_err(|e| e.to_string())?
            .starts_with(root)
        {
            return Err("Path escapes workspace".into());
        }
    }
    Ok(p)
}
#[tauri::command]
pub fn open_workspace(path: String) -> Result<Workspace, String> {
    let r = root(&path)?;
    let name = r
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    Ok(Workspace {
        name,
        path: r.to_string_lossy().into_owned(),
        entries: collect(&r, &r)?,
    })
}

#[tauri::command]
pub fn default_workspace(app: tauri::AppHandle) -> Result<Workspace, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("workspace");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    let root = root(&path.to_string_lossy())?;
    Ok(Workspace {
        name: "My Notes".into(),
        path: root.to_string_lossy().into_owned(),
        entries: collect(&root, &root)?,
    })
}
#[tauri::command]
pub fn list_workspace_tree(root_path: String) -> Result<Workspace, String> {
    let r = root(&root_path)?;
    let name = r
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    Ok(Workspace {
        name,
        path: r.to_string_lossy().into_owned(),
        entries: collect(&r, &r)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn with_temp_workspace<F>(f: F)
    where
        F: FnOnce(&PathBuf),
    {
        let tmp = std::env::temp_dir().join(format!("marnote_test_{}_{}", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        fs::create_dir_all(&tmp).unwrap();
        let ws = tmp.join("workspace");
        fs::create_dir_all(&ws).unwrap();
        let ws = fs::canonicalize(&ws).unwrap();
        f(&ws);
        let _ = fs::remove_dir_all(&tmp);
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
        with_temp_workspace(|ws| {
            let missing = ws.join("does_not_exist");
            let result = root(&missing.to_string_lossy());
            assert!(result.is_err());
        });
    }

    #[test]
    fn target_valid_relative_path() {
        with_temp_workspace(|ws| {
            let notes = ws.join("notes");
            fs::create_dir_all(&notes).unwrap();
            let result = target(ws, "notes/file.md", false);
            assert!(result.is_ok());
            let expected = ws.join("notes/file.md");
            assert_eq!(result.unwrap(), expected);
        });
    }

    #[test]
    fn target_rejects_empty_path() {
        with_temp_workspace(|ws| {
            let result = target(ws, "", false);
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), "Path must be a non-empty workspace-relative path");
        });
    }

    #[test]
    fn target_rejects_traversal_components() {
        with_temp_workspace(|ws| {
            let result = target(ws, "notes/../escape.md", false);
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), "Path must be a non-empty workspace-relative path");
        });
    }

    #[test]
    fn target_rejects_parent_escape_via_components() {
        with_temp_workspace(|ws| {
            let result = target(ws, "../outside.md", false);
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), "Path must be a non-empty workspace-relative path");
        });
    }

    #[test]
    fn target_rejects_symlink_when_exists() {
        with_temp_workspace(|ws| {
            let target_file = ws.join("real.md");
            fs::write(&target_file, b"content").unwrap();
            let link = ws.join("link.md");
            #[cfg(unix)]
            {
                use std::os::unix::fs::symlink;
                symlink(&target_file, &link).unwrap();
                let result = target(ws, "link.md", true);
                assert!(result.is_err(), "expected error for symlink, got: {:?}", result);
                assert_eq!(result.unwrap_err(), "Symlinks are not supported");
            }
            #[cfg(windows)]
            {
                use std::os::windows::fs::symlink_file;
                symlink_file(&target_file, &link).unwrap();
                let result = target(ws, "link.md", true);
                assert!(result.is_err(), "expected error for symlink, got: {:?}", result);
                assert_eq!(result.unwrap_err(), "Symlinks are not supported");
            }
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
            let link = ws.join("escape.md");
            #[cfg(unix)]
            {
                use std::os::unix::fs::symlink;
                symlink(&outside_file, &link).unwrap();
                let result = target(ws, "escape.md", true);
                assert!(result.is_err(), "expected error for escaping symlink, got: {:?}", result);
                assert_eq!(result.unwrap_err(), "Symlinks are not supported");
            }
            #[cfg(windows)]
            {
                use std::os::windows::fs::symlink_file;
                symlink_file(&outside_file, &link).unwrap();
                let result = target(ws, "escape.md", true);
                assert!(result.is_err(), "expected error for escaping symlink, got: {:?}", result);
                assert_eq!(result.unwrap_err(), "Symlinks are not supported");
            }
            let _ = fs::remove_dir_all(&outside_dir);
        });
    }

    #[test]
    fn target_allows_symlink_when_not_exists() {
        with_temp_workspace(|ws| {
            let result = target(ws, "new_link.md", false);
            assert!(result.is_ok());
        });
    }

    #[test]
    fn target_rejects_absolute_path() {
        with_temp_workspace(|ws| {
            let result = target(ws, "/absolute/path.md", false);
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), "Path must be a non-empty workspace-relative path");
        });
    }

    #[test]
    fn target_rejects_dot_component() {
        with_temp_workspace(|ws| {
            let result = target(ws, "./relative.md", false);
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), "Path must be a non-empty workspace-relative path");
        });
    }

    #[test]
    fn target_rejects_multiple_dots() {
        with_temp_workspace(|ws| {
            let result = target(ws, "a/../../b.md", false);
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), "Path must be a non-empty workspace-relative path");
        });
    }
}
