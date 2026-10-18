use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::Path};

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
    pub fn tags(&self) -> &[String] {
        self.tags.as_deref().unwrap_or_default()
    }

    pub fn icon(&self) -> Option<&str> {
        self.icon.as_deref()
    }

    pub fn favorite(&self) -> bool {
        self.favorite.unwrap_or(false)
    }

    pub fn created_ms(&self) -> Option<u128> {
        self.created_ms
    }

    pub fn updated_ms(&self) -> Option<u128> {
        self.updated_ms
    }
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
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn temp_dir() -> PathBuf {
        let mut path = std::env::temp_dir();
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        path.push(format!(
            "marnote_metadata_test_{}_{}",
            std::process::id(),
            nanos
        ));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn read_metadata_missing_file_returns_empty() {
        let temp = temp_dir();
        let result = read_metadata(&temp).unwrap();
        assert!(result.entries.is_empty());
    }

    #[test]
    fn read_metadata_empty_file_returns_empty() {
        let temp = temp_dir();
        let marnote_dir = temp.join(".marnote");
        fs::create_dir_all(&marnote_dir).unwrap();
        fs::write(marnote_dir.join("metadata.json"), "").unwrap();
        let result = read_metadata(&temp).unwrap();
        assert!(result.entries.is_empty());
    }

    #[test]
    fn read_metadata_valid_json() {
        let temp = temp_dir();
        let marnote_dir = temp.join(".marnote");
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
        let result = read_metadata(&temp).unwrap();
        assert_eq!(result.entries.len(), 2);

        let note_meta = result.entries.get("note.md").unwrap();
        assert_eq!(note_meta.tags(), &["work", "urgent"]);
        assert_eq!(note_meta.icon(), Some("📝"));
        assert!(note_meta.favorite());
        assert_eq!(note_meta.created_ms(), Some(1000));
        assert_eq!(note_meta.updated_ms(), Some(2000));

        let folder_meta = result.entries.get("folder").unwrap();
        assert_eq!(folder_meta.tags(), &["project"]);
        assert!(!folder_meta.favorite());
        assert_eq!(folder_meta.created_ms(), None);
        assert_eq!(folder_meta.updated_ms(), None);
    }

    #[test]
    fn read_metadata_malformed_json_returns_error() {
        let temp = temp_dir();
        let marnote_dir = temp.join(".marnote");
        fs::create_dir_all(&marnote_dir).unwrap();
        fs::write(marnote_dir.join("metadata.json"), "{ invalid json }").unwrap();
        let result = read_metadata(&temp);
        assert!(result.is_err());
    }

    #[test]
    fn entry_metadata_defaults() {
        let meta = EntryMetadata::default();
        assert!(meta.tags().is_empty());
        assert_eq!(meta.icon(), None);
        assert!(!meta.favorite());
        assert_eq!(meta.created_ms(), None);
        assert_eq!(meta.updated_ms(), None);
    }

    #[test]
    fn entry_metadata_partial_fields() {
        let meta = EntryMetadata {
            tags: Some(vec!["tag1".into()]),
            icon: None,
            favorite: None,
            created_ms: None,
            updated_ms: None,
        };
        assert_eq!(meta.tags(), &["tag1"]);
        assert_eq!(meta.icon(), None);
        assert!(!meta.favorite());
    }

    #[test]
    fn merge_metadata_applies_to_entries() {
        use crate::workspace::Entry;
        let entries = vec![
            Entry {
                name: "note.md".into(),
                path: "note.md".into(),
                kind: "file".into(),
                children: vec![],
                metadata: None,
            },
            Entry {
                name: "folder".into(),
                path: "folder".into(),
                kind: "directory".into(),
                children: vec![Entry {
                    name: "inner.md".into(),
                    path: "folder/inner.md".into(),
                    kind: "file".into(),
                    children: vec![],
                    metadata: None,
                }],
                metadata: None,
            },
        ];
        let mut metadata = WorkspaceMetadata::default();
        metadata.entries.insert(
            "note.md".into(),
            EntryMetadata {
                tags: Some(vec!["work".into()]),
                icon: Some("📝".into()),
                favorite: Some(true),
                created_ms: Some(1000),
                updated_ms: Some(2000),
            },
        );
        metadata.entries.insert(
            "folder".into(),
            EntryMetadata {
                tags: Some(vec!["project".into()]),
                icon: None,
                favorite: Some(false),
                created_ms: None,
                updated_ms: None,
            },
        );

        let merged = merge_metadata(entries, &metadata);
        assert_eq!(merged.len(), 2);

        let note = merged.iter().find(|e| e.name == "note.md").unwrap();
        assert!(note.metadata.is_some());
        let note_meta = note.metadata.as_ref().unwrap();
        assert_eq!(note_meta.tags(), &["work"]);
        assert_eq!(note_meta.icon(), Some("📝"));
        assert!(note_meta.favorite());
        assert_eq!(note_meta.created_ms(), Some(1000));
        assert_eq!(note_meta.updated_ms(), Some(2000));

        let folder = merged.iter().find(|e| e.name == "folder").unwrap();
        assert!(folder.metadata.is_some());
        let folder_meta = folder.metadata.as_ref().unwrap();
        assert_eq!(folder_meta.tags(), &["project"]);
        assert!(!folder_meta.favorite());

        let inner = &folder.children[0];
        assert!(inner.metadata.is_none());
    }

    #[test]
    fn merge_metadata_handles_missing_entries() {
        use crate::workspace::Entry;
        let entries = vec![Entry {
            name: "note.md".into(),
            path: "note.md".into(),
            kind: "file".into(),
            children: vec![],
            metadata: None,
        }];
        let metadata = WorkspaceMetadata::default();
        let merged = merge_metadata(entries, &metadata);
        assert_eq!(merged.len(), 1);
        assert!(merged[0].metadata.is_none());
    }
}
