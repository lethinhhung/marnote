use crate::metadata::{merge_metadata, read_metadata};
use crate::tree::collect;
use serde::Serialize;
use std::{fs, path::Path};
use tauri::Manager;

pub mod paths;
pub use paths::{root, target};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) kind: String,
    pub(crate) is_empty: bool,
    pub(crate) modified_ms: u128,
    pub(crate) children: Vec<Entry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) metadata: Option<crate::metadata::EntryMetadata>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    name: String,
    path: String,
    entries: Vec<Entry>,
    tags: std::collections::HashMap<String, String>,
    manual_order: std::collections::HashMap<String, Vec<String>>,
}

fn workspace_name(root: &Path) -> String {
    root.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned()
}

fn workspace_snapshot(root: &Path, name: String) -> Result<Workspace, String> {
    let metadata = read_metadata(root)?;
    Ok(Workspace {
        name,
        path: root.to_string_lossy().into_owned(),
        entries: merge_metadata(collect(root, root)?, &metadata),
        tags: metadata.tags,
        manual_order: metadata.manual_order,
    })
}

#[tauri::command]
pub fn open_workspace(path: String) -> Result<Workspace, String> {
    let r = root(&path)?;
    workspace_snapshot(&r, workspace_name(&r))
}

#[tauri::command]
pub fn default_workspace(app: tauri::AppHandle) -> Result<Workspace, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("workspace");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    let r = root(&path.to_string_lossy())?;
    workspace_snapshot(&r, "My Notes".into())
}

#[tauri::command]
pub fn list_workspace_tree(root_path: String) -> Result<Workspace, String> {
    let r = root(&root_path)?;
    workspace_snapshot(&r, workspace_name(&r))
}

#[cfg(test)]
mod commands_tests;

#[cfg(test)]
mod paths_tests;
