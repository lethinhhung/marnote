use serde::{Deserialize, Serialize};
use crate::{metadata, workspace::root};
use std::{collections::HashMap, fs, path::Path};

pub(super) const INDEX: &str = "index.json";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TrashRecord {
    pub path: String,
    pub kind: String,
    pub entries: HashMap<String, metadata::EntryMetadata>,
    pub manual_order: HashMap<String, Vec<String>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashItem {
    pub id: String,
    pub path: String,
    pub kind: String,
    pub restorable: bool,
}

pub(super) fn directory(root: &Path) -> std::path::PathBuf {
    root.join(".marnote-trash")
}

pub(super) fn read_index(root: &Path) -> Result<HashMap<String, TrashRecord>, String> {
    let path = directory(root).join(INDEX);
    if !path.exists() {
        return Ok(HashMap::new());
    }
    serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

pub(super) fn write_index(root: &Path, index: &HashMap<String, TrashRecord>) -> Result<(), String> {
    let dir = directory(root);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(
        dir.join(INDEX),
        serde_json::to_vec_pretty(index).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

pub fn list(root_path: &str) -> Result<Vec<TrashItem>, String> {
    let root = root(root_path)?;
    let index = read_index(&root)?;
    let dir = directory(&root);
    let mut items: Vec<_> = index
        .iter()
        .filter_map(|(id, item)| {
            dir.join(id).exists().then_some(TrashItem {
                id: id.clone(),
                path: item.path.clone(),
                kind: item.kind.clone(),
                restorable: true,
            })
        })
        .collect();
    if dir.exists() {
        for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let id = entry.file_name().to_string_lossy().into_owned();
            if id != INDEX && !index.contains_key(&id) {
                let kind = if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
                    "directory"
                } else {
                    "file"
                };
                items.push(TrashItem {
                    id,
                    path: "Older item (cannot be restored)".into(),
                    kind: kind.into(),
                    restorable: false,
                });
            }
        }
    }
    Ok(items)
}
