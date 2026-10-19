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