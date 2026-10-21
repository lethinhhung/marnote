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
fn mutations_preserve_unrelated_records() {
    let temp = temp_dir();
    let mut original = WorkspaceMetadata::default();
    original.entries.insert("keep.md".into(), EntryMetadata { favorite: Some(true), ..Default::default() });
    original.entries.insert("edit.md".into(), EntryMetadata { tags: Some(vec!["old".into()]), ..Default::default() });
    write_metadata(&temp, &original).unwrap();

    update_metadata(&temp, "edit.md", EntryMetadata { tags: Some(vec!["new".into()]), ..Default::default() }).unwrap();
    remove_metadata(&temp, "gone.md").unwrap();
    let result = read_metadata(&temp).unwrap();
    assert_eq!(result.entries.len(), 2);
    assert!(result.entries["keep.md"].favorite());
    assert_eq!(result.entries["edit.md"].tags(), &["new"]);
}

#[test]
fn mutations_reject_malformed_metadata_without_replacing_it() {
    let temp = temp_dir();
    let path = temp.join(".marnote/metadata.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, "{ broken").unwrap();
    assert!(update_metadata(&temp, "new.md", EntryMetadata::default()).is_err());
    assert_eq!(fs::read_to_string(path).unwrap(), "{ broken");
}

#[test]
fn failed_atomic_write_keeps_existing_metadata() {
    let temp = temp_dir();
    let path = temp.join(".marnote/metadata.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, r#"{"entries":{}}"#).unwrap();
    let collision = path.parent().unwrap().join(format!(".metadata-{}.tmp", std::process::id()));
    fs::write(&collision, "occupied").unwrap();

    assert!(update_metadata(&temp, "new.md", EntryMetadata::default()).is_err());
    assert_eq!(fs::read_to_string(path).unwrap(), r#"{"entries":{}}"#);
    fs::remove_file(collision).unwrap();
}