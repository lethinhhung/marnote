use super::*;
use crate::workspace::Entry;

#[test]
fn merge_metadata_applies_to_entries() {
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