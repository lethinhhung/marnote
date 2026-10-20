use super::*;
use std::fs;
use std::path::Path;

fn write_metadata(ws: &Path, json: &str) {
    let dir = ws.join(".marnote");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("metadata.json"), json).unwrap();
}

#[test]
fn open_workspace_attaches_metadata_to_matching_entries() {
    with_temp_workspace(|ws| {
        fs::write(ws.join("note.md"), "# Note").unwrap();
        fs::create_dir_all(ws.join("folder")).unwrap();
        fs::write(ws.join("folder/inner.md"), "# Inner").unwrap();
        write_metadata(
            ws,
            r#"{
              "entries": {
                "note.md": { "tags": ["work", "urgent"], "icon": "📝", "favorite": true, "createdMs": 1000, "updatedMs": 2000 },
                "folder": { "tags": ["project"], "favorite": false }
              }
            }"#,
        );
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
        write_metadata(ws, r#"{"entries": {"note.md": {"tags": ["test"]}}}"#);
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
        write_metadata(ws, r#"{"entries": {"note.md": {"favorite": true}}}"#);
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
        write_metadata(ws, r#"{"entries": {"note.md": {"icon": "⭐"}}}"#);
        let metadata = crate::metadata::read_metadata(ws).unwrap();
        let entries = crate::tree::collect(ws, ws).unwrap();
        let merged = crate::metadata::merge_metadata(entries, &metadata);
        let note = merged.iter().find(|e| e.name == "note.md").unwrap();
        assert!(note.metadata.is_some());
        assert_eq!(note.metadata.as_ref().unwrap().icon.as_deref(), Some("⭐"));
    });
}
