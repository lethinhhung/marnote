use super::{list_workspace_tree, open_workspace, Entry};
use std::fs;
use std::path::{Path, PathBuf};

const NOTE_METADATA: &str = r#"{"entries": {"note.md": {"tags": ["work", "urgent"], "icon": "📝", "favorite": true, "createdMs": 1000, "updatedMs": 2000}, "folder": {"tags": ["project"], "favorite": false}}}"#;

fn temp_workspace() -> PathBuf {
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let path = std::env::temp_dir().join(format!("marnote-ws-{}-{unique}", std::process::id()));
    fs::create_dir_all(&path).unwrap();
    fs::canonicalize(&path).unwrap()
}

fn write_metadata(ws: &Path, json: &str) {
    let directory = ws.join(".marnote");
    fs::create_dir_all(&directory).unwrap();
    fs::write(directory.join("metadata.json"), json).unwrap();
}

fn seed_entries(ws: &Path) {
    fs::write(ws.join("note.md"), "# Note").unwrap();
    fs::create_dir_all(ws.join("folder")).unwrap();
    fs::write(ws.join("folder/inner.md"), "# Inner").unwrap();
}

fn assert_no_metadata(entries: &[Entry]) {
    for entry in entries {
        let name = &entry.name;
        assert!(entry.metadata.is_none(), "Entry {name} has no metadata");
        for child in &entry.children {
            let name = &child.name;
            assert!(child.metadata.is_none(), "Child {name} has no metadata");
        }
    }
}

#[test]
fn open_workspace_attaches_metadata_to_matching_entries() {
    let ws = temp_workspace();
    seed_entries(&ws);
    write_metadata(&ws, NOTE_METADATA);
    let result = open_workspace(ws.to_string_lossy().into_owned()).unwrap();
    assert_eq!(result.entries.len(), 2);
    let note = result.entries.iter().find(|e| e.name == "note.md").unwrap();
    let meta = note.metadata.as_ref().unwrap();
    assert_eq!(meta.tags, Some(vec!["work".into(), "urgent".into()]));
    assert_eq!(meta.icon.as_deref(), Some("📝"));
    assert_eq!(meta.favorite, Some(true));
    assert_eq!(meta.created_ms, Some(1000));
    assert_eq!(meta.updated_ms, Some(2000));
    let folder = result.entries.iter().find(|e| e.name == "folder").unwrap();
    let folder_meta = folder.metadata.as_ref().unwrap();
    assert_eq!(folder_meta.tags, Some(vec!["project".into()]));
    assert_eq!(folder_meta.favorite, Some(false));
    assert_eq!(folder.children[0].name, "inner.md");
    assert!(folder.children[0].metadata.is_none());
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn open_workspace_without_metadata_file_returns_tree_without_metadata() {
    let ws = temp_workspace();
    seed_entries(&ws);
    let result = open_workspace(ws.to_string_lossy().into_owned()).unwrap();
    assert_eq!(result.entries.len(), 2);
    assert_no_metadata(&result.entries);
    let metadata_path = ws.join(".marnote").join("metadata.json");
    assert!(
        !metadata_path.exists(),
        "Metadata file should not be created"
    );
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn open_workspace_does_not_modify_markdown_files() {
    let ws = temp_workspace();
    seed_entries(&ws);
    write_metadata(&ws, r#"{"entries": {"note.md": {"tags": ["test"]}}}"#);
    let _ = open_workspace(ws.to_string_lossy().into_owned()).unwrap();
    assert_eq!(fs::read_to_string(ws.join("note.md")).unwrap(), "# Note");
    let inner = fs::read_to_string(ws.join("folder/inner.md")).unwrap();
    assert_eq!(inner, "# Inner");
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn list_workspace_tree_attaches_metadata() {
    let ws = temp_workspace();
    seed_entries(&ws);
    write_metadata(&ws, r#"{"entries": {"note.md": {"favorite": true}}}"#);
    let result = list_workspace_tree(ws.to_string_lossy().into_owned()).unwrap();
    let note = result.entries.iter().find(|e| e.name == "note.md").unwrap();
    assert_eq!(note.metadata.as_ref().unwrap().favorite, Some(true));
    let folder = result.entries.iter().find(|e| e.name == "folder").unwrap();
    assert!(folder.metadata.is_none());
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn default_workspace_attaches_metadata() {
    let ws = temp_workspace();
    fs::write(ws.join("note.md"), "# Note").unwrap();
    write_metadata(&ws, r#"{"entries": {"note.md": {"icon": "⭐"}}}"#);
    let metadata = crate::metadata::read_metadata(&ws).unwrap();
    let entries = crate::tree::collect(&ws, &ws).unwrap();
    let merged = crate::metadata::merge_metadata(entries, &metadata);
    let note = merged.iter().find(|e| e.name == "note.md").unwrap();
    assert_eq!(note.metadata.as_ref().unwrap().icon.as_deref(), Some("⭐"));
    fs::remove_dir_all(&ws).unwrap();
}
