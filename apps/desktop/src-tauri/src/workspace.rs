use crate::metadata::{merge_metadata, read_metadata};
use crate::tree::collect;
use serde::Serialize;
use std::{
    fs,
    path::{Component, Path, PathBuf},
};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) kind: String,
    pub(crate) children: Vec<Entry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) metadata: Option<crate::metadata::EntryMetadata>,
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
    let metadata = read_metadata(&r)?;
    let name = r
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    Ok(Workspace {
        name,
        path: r.to_string_lossy().into_owned(),
        entries: merge_metadata(collect(&r, &r)?, &metadata),
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
    let metadata = read_metadata(&root)?;
    Ok(Workspace {
        name: "My Notes".into(),
        path: root.to_string_lossy().into_owned(),
        entries: merge_metadata(collect(&root, &root)?, &metadata),
    })
}
#[tauri::command]
pub fn list_workspace_tree(root_path: String) -> Result<Workspace, String> {
    let r = root(&root_path)?;
    let metadata = read_metadata(&r)?;
    let name = r
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    Ok(Workspace {
        name,
        path: r.to_string_lossy().into_owned(),
        entries: merge_metadata(collect(&r, &r)?, &metadata),
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
        let tmp = std::env::temp_dir().join(format!(
            "marnote_test_{}_{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
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
            assert_eq!(
                result.unwrap_err(),
                "Path must be a non-empty workspace-relative path"
            );
        });
    }

    #[test]
    fn target_rejects_traversal_components() {
        with_temp_workspace(|ws| {
            let result = target(ws, "notes/../escape.md", false);
            assert!(result.is_err());
            assert_eq!(
                result.unwrap_err(),
                "Path must be a non-empty workspace-relative path"
            );
        });
    }

    #[test]
    fn target_rejects_parent_escape_via_components() {
        with_temp_workspace(|ws| {
            let result = target(ws, "../outside.md", false);
            assert!(result.is_err());
            assert_eq!(
                result.unwrap_err(),
                "Path must be a non-empty workspace-relative path"
            );
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
                assert!(
                    result.is_err(),
                    "expected error for symlink, got: {:?}",
                    result
                );
                assert_eq!(result.unwrap_err(), "Symlinks are not supported");
            }
            #[cfg(windows)]
            {
                use std::os::windows::fs::symlink_file;
                symlink_file(&target_file, &link).unwrap();
                let result = target(ws, "link.md", true);
                assert!(
                    result.is_err(),
                    "expected error for symlink, got: {:?}",
                    result
                );
                assert_eq!(result.unwrap_err(), "Symlinks are not supported");
            }
        });
    }

    #[test]
    fn target_rejects_existing_symlink_escaping_workspace() {
        with_temp_workspace(|ws| {
            let outside_dir =
                std::env::temp_dir().join(format!("marnote_outside_{}", std::process::id()));
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
                assert!(
                    result.is_err(),
                    "expected error for escaping symlink, got: {:?}",
                    result
                );
                assert_eq!(result.unwrap_err(), "Symlinks are not supported");
            }
            #[cfg(windows)]
            {
                use std::os::windows::fs::symlink_file;
                symlink_file(&outside_file, &link).unwrap();
                let result = target(ws, "escape.md", true);
                assert!(
                    result.is_err(),
                    "expected error for escaping symlink, got: {:?}",
                    result
                );
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
            assert_eq!(
                result.unwrap_err(),
                "Path must be a non-empty workspace-relative path"
            );
        });
    }

    #[test]
    fn target_rejects_dot_component() {
        with_temp_workspace(|ws| {
            let result = target(ws, "./relative.md", false);
            assert!(result.is_err());
            assert_eq!(
                result.unwrap_err(),
                "Path must be a non-empty workspace-relative path"
            );
        });
    }

    #[test]
    fn target_rejects_multiple_dots() {
        with_temp_workspace(|ws| {
            let result = target(ws, "a/../../b.md", false);
            assert!(result.is_err());
            assert_eq!(
                result.unwrap_err(),
                "Path must be a non-empty workspace-relative path"
            );
        });
    }

    #[test]
    fn open_workspace_attaches_metadata_to_matching_entries() {
        with_temp_workspace(|ws| {
            fs::write(ws.join("note.md"), "# Note").unwrap();
            fs::create_dir_all(ws.join("folder")).unwrap();
            fs::write(ws.join("folder/inner.md"), "# Inner").unwrap();

            let marnote_dir = ws.join(".marnote");
            fs::create_dir_all(&marnote_dir).unwrap();
            let json = r#"{
                "entries": {
                    "note.md": {
                        "tags": ["work", "urgent"],
                        "icon": "📝",
                        "favorite": true,
                        "createdMs": 1000,
                        "updatedMs": 2000
                    },
                    "folder": {
                        "tags": ["project"],
                        "favorite": false
                    }
                }
            }"#;
            fs::write(marnote_dir.join("metadata.json"), json).unwrap();

            let result = open_workspace(ws.to_string_lossy().into_owned()).unwrap();

            assert_eq!(result.entries.len(), 2);

            let note = result.entries.iter().find(|e| e.name == "note.md").unwrap();
            assert!(note.metadata.is_some());
            let meta = note.metadata.as_ref().unwrap();
            assert_eq!(meta.tags.as_deref(), Some(&["work".to_string(), "urgent".to_string()][..]));
            assert_eq!(meta.icon.as_deref(), Some("📝"));
            assert_eq!(meta.favorite, Some(true));
            assert_eq!(meta.created_ms, Some(1000));
            assert_eq!(meta.updated_ms, Some(2000));

            let folder = result.entries.iter().find(|e| e.name == "folder").unwrap();
            assert!(folder.metadata.is_some());
            let folder_meta = folder.metadata.as_ref().unwrap();
            assert_eq!(folder_meta.tags.as_deref(), Some(&["project".to_string()][..]));
            assert_eq!(folder_meta.favorite, Some(false));

            let inner = &folder.children[0];
            assert_eq!(inner.name, "inner.md");
            assert!(inner.metadata.is_none());
        });
    }

    #[test]
    fn open_workspace_without_metadata_file_returns_tree_without_metadata() {
        with_temp_workspace(|ws| {
            fs::write(ws.join("note.md"), "# Note").unwrap();
            fs::create_dir_all(ws.join("folder")).unwrap();
            fs::write(ws.join("folder/inner.md"), "# Inner").unwrap();

            let result = open_workspace(ws.to_string_lossy().into_owned()).unwrap();

            assert_eq!(result.entries.len(), 2);
            for entry in &result.entries {
                assert!(entry.metadata.is_none(), "Entry {} should have no metadata", entry.name);
                for child in &entry.children {
                    assert!(child.metadata.is_none(), "Child {} should have no metadata", child.name);
                }
            }

            let metadata_path = ws.join(".marnote").join("metadata.json");
            assert!(!metadata_path.exists(), "Metadata file should not be created");
        });
    }

    #[test]
    fn open_workspace_does_not_modify_markdown_files() {
        with_temp_workspace(|ws| {
            let note_content = "# Original Note\n\nContent here.";
            fs::write(ws.join("note.md"), note_content).unwrap();
            fs::create_dir_all(ws.join("folder")).unwrap();
            fs::write(ws.join("folder/inner.md"), "# Inner").unwrap();

            let marnote_dir = ws.join(".marnote");
            fs::create_dir_all(&marnote_dir).unwrap();
            let json = r#"{"entries": {"note.md": {"tags": ["test"]}}}"#;
            fs::write(marnote_dir.join("metadata.json"), json).unwrap();

            let _ = open_workspace(ws.to_string_lossy().into_owned()).unwrap();

            let note_content_after = fs::read_to_string(ws.join("note.md")).unwrap();
            assert_eq!(note_content_after, note_content);

            let inner_content_after = fs::read_to_string(ws.join("folder/inner.md")).unwrap();
            assert_eq!(inner_content_after, "# Inner");
        });
    }

    #[test]
    fn list_workspace_tree_attaches_metadata() {
        with_temp_workspace(|ws| {
            fs::write(ws.join("note.md"), "# Note").unwrap();
            fs::create_dir_all(ws.join("folder")).unwrap();

            let marnote_dir = ws.join(".marnote");
            fs::create_dir_all(&marnote_dir).unwrap();
            let json = r#"{"entries": {"note.md": {"favorite": true}}}"#;
            fs::write(marnote_dir.join("metadata.json"), json).unwrap();

            let result = list_workspace_tree(ws.to_string_lossy().into_owned()).unwrap();

            let note = result.entries.iter().find(|e| e.name == "note.md").unwrap();
            assert!(note.metadata.is_some());
            assert_eq!(note.metadata.as_ref().unwrap().favorite, Some(true));

            let folder = result.entries.iter().find(|e| e.name == "folder").unwrap();
            assert!(folder.metadata.is_none());
        });
    }

    #[test]
    fn default_workspace_attaches_metadata() {
        with_temp_workspace(|ws| {
            fs::write(ws.join("note.md"), "# Note").unwrap();

            let marnote_dir = ws.join(".marnote");
            fs::create_dir_all(&marnote_dir).unwrap();
            let json = r#"{"entries": {"note.md": {"icon": "⭐"}}}"#;
            fs::write(marnote_dir.join("metadata.json"), json).unwrap();

            let metadata = crate::metadata::read_metadata(ws).unwrap();
            let entries = crate::tree::collect(ws, ws).unwrap();
            let merged = crate::metadata::merge_metadata(entries, &metadata);

            let note = merged.iter().find(|e| e.name == "note.md").unwrap();
            assert!(note.metadata.is_some());
            assert_eq!(note.metadata.as_ref().unwrap().icon.as_deref(), Some("⭐"));
        });
    }
}
