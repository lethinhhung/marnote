use super::{file_create_markdown, file_delete, file_list_trash};
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> PathBuf {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let path = std::env::temp_dir().join(format!("marnote-trash-{id}"));
    if path.exists() {
        fs::remove_dir_all(&path).unwrap();
    }
    fs::create_dir_all(&path).unwrap();
    path
}

fn root(path: &PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

fn trash_dir(path: &PathBuf) -> PathBuf {
    path.join(".marnote-trash")
}

fn trash_id(delete_result: &str) -> String {
    std::path::Path::new(delete_result)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .into_owned()
}

#[test]
fn list_trash_returns_current_indexed_entries() {
    let ws = workspace();
    file_create_markdown(root(&ws), "note1.md".into(), "content1".into()).unwrap();
    file_create_markdown(root(&ws), "note2.md".into(), "content2".into()).unwrap();

    let id1 = trash_id(&file_delete(root(&ws), "note1.md".into()).unwrap());
    let id2 = trash_id(&file_delete(root(&ws), "note2.md".into()).unwrap());

    let items = file_list_trash(root(&ws)).unwrap();
    assert_eq!(items.len(), 2);

    let item1 = items.iter().find(|i| i.id == id1).unwrap();
    let item2 = items.iter().find(|i| i.id == id2).unwrap();

    assert_eq!(item1.path, "note1.md");
    assert_eq!(item1.kind, "file");
    assert!(item1.restorable);

    assert_eq!(item2.path, "note2.md");
    assert_eq!(item2.kind, "file");
    assert!(item2.restorable);
}

#[test]
fn list_trash_returns_directory_entries() {
    let ws = workspace();
    fs::create_dir_all(ws.join("folder/sub")).unwrap();
    file_create_markdown(root(&ws), "folder/sub/note.md".into(), "content".into()).unwrap();

    let id = trash_id(&file_delete(root(&ws), "folder".into()).unwrap());

    let items = file_list_trash(root(&ws)).unwrap();
    assert_eq!(items.len(), 1);

    let item = &items[0];
    assert_eq!(item.id, id);
    assert_eq!(item.path, "folder");
    assert_eq!(item.kind, "directory");
    assert!(item.restorable);
}

#[test]
fn list_trash_includes_legacy_items_not_in_index() {
    let ws = workspace();
    file_create_markdown(root(&ws), "note.md".into(), "content".into()).unwrap();
    let id = trash_id(&file_delete(root(&ws), "note.md".into()).unwrap());

    let trash = trash_dir(&ws);
    let legacy_file = trash.join("legacy-file.bin");
    let legacy_dir = trash.join("legacy-dir");
    fs::write(&legacy_file, b"old").unwrap();
    fs::create_dir_all(&legacy_dir).unwrap();

    let items = file_list_trash(root(&ws)).unwrap();
    assert_eq!(items.len(), 3);

    let current = items.iter().find(|i| i.id == id).unwrap();
    assert!(current.restorable);

    let legacy_file_item = items.iter().find(|i| i.id == "legacy-file.bin").unwrap();
    assert!(!legacy_file_item.restorable);
    assert_eq!(legacy_file_item.path, "Older item (cannot be restored)");
    assert_eq!(legacy_file_item.kind, "file");

    let legacy_dir_item = items.iter().find(|i| i.id == "legacy-dir").unwrap();
    assert!(!legacy_dir_item.restorable);
    assert_eq!(legacy_dir_item.path, "Older item (cannot be restored)");
    assert_eq!(legacy_dir_item.kind, "directory");
}

#[test]
fn list_trash_omits_index_file_and_unrelated_workspace_files() {
    let ws = workspace();
    file_create_markdown(root(&ws), "note.md".into(), "content".into()).unwrap();
    let id = trash_id(&file_delete(root(&ws), "note.md".into()).unwrap());

    let trash = trash_dir(&ws);
    fs::write(trash.join("index.json"), b"{}").unwrap();
    fs::write(ws.join("unrelated.txt"), b"outside").unwrap();

    let items = file_list_trash(root(&ws)).unwrap();
    let ids: Vec<_> = items.iter().map(|i| i.id.as_str()).collect();

    assert!(ids.contains(&id.as_str()));
    assert!(!ids.contains(&"index.json"));
    assert!(!ids.contains(&"unrelated.txt"));
}

#[test]
fn list_trash_empty_when_nothing_trashed() {
    let ws = workspace();
    let items = file_list_trash(root(&ws)).unwrap();
    assert!(items.is_empty());
}

#[test]
fn list_trash_filters_out_deleted_index_entries_whose_files_are_gone() {
    let ws = workspace();
    file_create_markdown(root(&ws), "note.md".into(), "content".into()).unwrap();
    let id = trash_id(&file_delete(root(&ws), "note.md".into()).unwrap());

    let trash = trash_dir(&ws);
    let entry_path = trash.join(&id);
    if entry_path.is_dir() {
        fs::remove_dir_all(&entry_path).unwrap();
    } else {
        fs::remove_file(&entry_path).unwrap();
    }

    let items = file_list_trash(root(&ws)).unwrap();
    assert!(items.is_empty());
}