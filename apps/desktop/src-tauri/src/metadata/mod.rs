use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, io::Write, path::Path};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryMetadata {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub favorite: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_ms: Option<u128>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_ms: Option<u128>,
}

impl EntryMetadata {
    pub fn tags(&self) -> &[String] { self.tags.as_deref().unwrap_or_default() }
    pub fn icon(&self) -> Option<&str> { self.icon.as_deref() }
    pub fn favorite(&self) -> bool { self.favorite.unwrap_or(false) }
    pub fn created_ms(&self) -> Option<u128> { self.created_ms }
    pub fn updated_ms(&self) -> Option<u128> { self.updated_ms }
}
#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMetadata {
    #[serde(default)]
    pub entries: HashMap<String, EntryMetadata>,
}

pub fn read_metadata(root: &Path) -> Result<WorkspaceMetadata, String> {
    let metadata_path = root.join(".marnote").join("metadata.json");
    if !metadata_path.exists() {
        return Ok(WorkspaceMetadata::default());
    }
    let content = fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    if content.trim().is_empty() {
        return Ok(WorkspaceMetadata::default());
    }
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn update_metadata(
    root: &Path,
    path: &str,
    metadata: EntryMetadata,
) -> Result<(), String> {
    let mut store = read_metadata(root)?;
    store.entries.insert(path.to_owned(), metadata);
    write_metadata(root, &store)
}

pub fn remove_metadata(root: &Path, path: &str) -> Result<(), String> {
    let mut store = read_metadata(root)?;
    store.entries.remove(path);
    write_metadata(root, &store)
}

pub fn write_metadata(root: &Path, store: &WorkspaceMetadata) -> Result<(), String> {
    let directory = root.join(".marnote");
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let path = directory.join("metadata.json");
    let temp = directory.join(format!(".metadata-{}.tmp", std::process::id()));
    let mut created_temp = false;
    let result = (|| {
        let contents = serde_json::to_vec_pretty(store).map_err(|e| e.to_string())?;
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .map_err(|e| e.to_string())?;
        created_temp = true;
        file.write_all(&contents).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
        fs::rename(&temp, &path).map_err(|e| e.to_string())
    })();
    if result.is_err() && created_temp {
        let _ = fs::remove_file(temp);
    }
    result
}

pub fn merge_metadata(
    entries: Vec<crate::workspace::Entry>,
    metadata: &WorkspaceMetadata,
) -> Vec<crate::workspace::Entry> {
    fn merge_entry(
        mut entry: crate::workspace::Entry,
        metadata: &WorkspaceMetadata,
    ) -> crate::workspace::Entry {
        if let Some(meta) = metadata.entries.get(&entry.path) {
            entry.metadata = Some(meta.clone());
        }
        entry.children = entry
            .children
            .into_iter()
            .map(|child| merge_entry(child, metadata))
            .collect();
        entry
    }

    entries
        .into_iter()
        .map(|entry| merge_entry(entry, metadata))
        .collect()
}

#[cfg(test)]
mod tests;
#[cfg(test)]
mod tests_merge;
#[cfg(test)]
mod tests_mutations;
