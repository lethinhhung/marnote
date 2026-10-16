use crate::tree::collect;
use serde::Serialize;
use std::{
    fs,
    path::{Component, Path, PathBuf},
};

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
