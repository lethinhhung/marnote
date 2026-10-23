use super::{metadata, tags};
use std::fs;
use std::path::{Path, PathBuf};

fn temp_workspace() -> PathBuf {
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let thread_id = std::thread::current().id();
    let path = std::env::temp_dir().join(format!("marnote-tag-test-{}-{:?}-{unique}", std::process::id(), thread_id));
    fs::create_dir_all(&path).unwrap();
    fs::canonicalize(&path).unwrap()
}

fn write_metadata(ws: &Path, json: &str) {
    let directory = ws.join(".marnote");
    fs::create_dir_all(&directory).unwrap();
    fs::write(directory.join("metadata.json"), json).unwrap();
}

fn read_tags(ws: &Path) -> metadata::WorkspaceMetadata {
    metadata::read_metadata(ws).unwrap()
}

#[test]
fn rename_tag_rejects_empty_name() {
    let ws = temp_workspace();
    write_metadata(&ws, r##"{"tags": {"old": "#ff0000"}}"##);
    let err = tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "old".into(),
        "".into(),
        "#ff0000".into(),
    )
    .unwrap_err();
    assert!(err.contains("invalid"));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn rename_tag_rejects_whitespace_only_name() {
    let ws = temp_workspace();
    write_metadata(&ws, r##"{"tags": {"old": "#ff0000"}}"##);
    let err = tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "old".into(),
        "   ".into(),
        "#ff0000".into(),
    )
    .unwrap_err();
    assert!(err.contains("invalid"));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn rename_tag_rejects_invalid_color_short_hex() {
    let ws = temp_workspace();
    write_metadata(&ws, r##"{"tags": {"old": "#ff0000"}}"##);
    let err = tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "old".into(),
        "new".into(),
        "#fff".into(),
    )
    .unwrap_err();
    assert!(err.contains("invalid"));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn rename_tag_rejects_invalid_color_non_hex() {
    let ws = temp_workspace();
    write_metadata(&ws, r##"{"tags": {"old": "#ff0000"}}"##);
    let err = tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "old".into(),
        "new".into(),
        "#gggggg".into(),
    )
    .unwrap_err();
    assert!(err.contains("invalid"));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn rename_tag_rejects_invalid_color_missing_hash() {
    let ws = temp_workspace();
    write_metadata(&ws, r##"{"tags": {"old": "#ff0000"}}"##);
    let err = tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "old".into(),
        "new".into(),
        "ff0000".into(),
    )
    .unwrap_err();
    assert!(err.contains("invalid"));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn rename_tag_rejects_duplicate_name() {
    let ws = temp_workspace();
    write_metadata(
        &ws,
        r##"{"tags": {"old": "#ff0000", "existing": "#00ff00"}}"##,
    );
    let err = tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "old".into(),
        "existing".into(),
        "#0000ff".into(),
    )
    .unwrap_err();
    assert!(err.contains("already exists"));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn rename_tag_allows_same_name_with_new_color() {
    let ws = temp_workspace();
    write_metadata(&ws, r##"{"tags": {"work": "#ff0000"}}"##);
    tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "work".into(),
        "work".into(),
        "#00ff00".into(),
    )
    .unwrap();
    let store = read_tags(&ws);
    assert_eq!(store.tags.get("work"), Some(&"#00ff00".to_string()));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn rename_tag_updates_entry_tag_references() {
    let ws = temp_workspace();
    fs::write(ws.join("note.md"), "# Note").unwrap();
    fs::create_dir_all(ws.join("folder")).unwrap();
    fs::write(ws.join("folder/inner.md"), "# Inner").unwrap();
    write_metadata(
        &ws,
        r##"{
            "entries": {
                "note.md": {"tags": ["work", "urgent"]},
                "folder/inner.md": {"tags": ["work"]},
                "folder": {"tags": ["project"]}
            },
            "tags": {"work": "#ff0000", "urgent": "#00ff00", "project": "#0000ff"}
        }"##,
    );
    tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "work".into(),
        "job".into(),
        "#ff0000".into(),
    )
    .unwrap();
    let store = read_tags(&ws);
    let note_meta = store.entries.get("note.md").unwrap();
    assert_eq!(note_meta.tags.as_deref(), Some(&["job".to_string(), "urgent".to_string()][..]));
    let inner_meta = store.entries.get("folder/inner.md").unwrap();
    assert_eq!(inner_meta.tags.as_deref(), Some(&["job".to_string()][..]));
    let folder_meta = store.entries.get("folder").unwrap();
    assert_eq!(folder_meta.tags.as_deref(), Some(&["project".to_string()][..]));
    assert!(store.tags.contains_key("job"));
    assert!(!store.tags.contains_key("work"));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn rename_tag_persists_metadata_with_new_name_and_color() {
    let ws = temp_workspace();
    write_metadata(&ws, r##"{"tags": {"old": "#ff0000"}}"##);
    tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "old".into(),
        "new".into(),
        "#00ff00".into(),
    )
    .unwrap();
    let store = read_tags(&ws);
    assert_eq!(store.tags.get("new"), Some(&"#00ff00".to_string()));
    assert!(!store.tags.contains_key("old"));
    let metadata_path = ws.join(".marnote").join("metadata.json");
    let content = fs::read_to_string(&metadata_path).unwrap();
    assert!(content.contains("\"new\""));
    assert!(content.contains("#00ff00"));
    assert!(!content.contains("\"old\""));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn rename_tag_trims_whitespace_and_leading_hash_from_new_name() {
    let ws = temp_workspace();
    write_metadata(&ws, r##"{"tags": {"old": "#ff0000"}}"##);
    tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "old".into(),
        "  #new-tag  ".into(),
        "#00ff00".into(),
    )
    .unwrap();
    let store = read_tags(&ws);
    assert_eq!(store.tags.get("new-tag"), Some(&"#00ff00".to_string()));
    fs::remove_dir_all(&ws).unwrap();
}

#[test]
fn rename_tag_nonexistent_old_name_creates_new_tag() {
    let ws = temp_workspace();
    write_metadata(&ws, r##"{"tags": {}}"##);
    tags::rename_workspace_tag(
        ws.to_string_lossy().into_owned(),
        "nonexistent".into(),
        "new".into(),
        "#00ff00".into(),
    )
    .unwrap();
    let store = read_tags(&ws);
    assert_eq!(store.tags.get("new"), Some(&"#00ff00".to_string()));
    fs::remove_dir_all(&ws).unwrap();
}