mod ipc_lifecycle_support;

use ipc_lifecycle_support::{invoke, TempWorkspace};
use std::fs;
use tauri::test::{mock_builder, mock_context, noop_assets};

fn has_path(entries: &serde_json::Value, path: &str) -> bool {
    entries.as_array().is_some_and(|entries| {
        entries
            .iter()
            .any(|entry| entry["path"] == path || has_path(&entry["children"], path))
    })
}

#[test]
fn ipc_workspace_note_lifecycle_create_move_trash_restore() {
    let ws = TempWorkspace::new();
    let app = mock_builder()
        .invoke_handler(crate::invoke_handler!(test))
        .build(mock_context(noop_assets()))
        .unwrap();
    let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();
    let root = ws.root.to_string_lossy().into_owned();

    let opened: serde_json::Value = invoke(
        &webview,
        "open_workspace",
        serde_json::json!({ "path": root }),
    )
    .unwrap();
    assert!(opened["entries"].as_array().unwrap().is_empty());

    invoke::<String>(
        &webview,
        "file_create_markdown",
        serde_json::json!({ "rootPath": root, "path": "note.md", "content": "hello" }),
    )
    .unwrap();
    let tree: serde_json::Value = invoke(
        &webview,
        "list_workspace_tree",
        serde_json::json!({ "rootPath": root }),
    )
    .unwrap();
    assert!(has_path(&tree["entries"], "note.md"));
    assert_eq!(
        fs::read_to_string(ws.root.join("note.md")).unwrap(),
        "hello"
    );

    fs::create_dir(ws.root.join("folder")).unwrap();
    invoke::<()>(
        &webview,
        "file_move",
        serde_json::json!({ "rootPath": root, "source": "note.md", "destination": "folder/note.md" }),
    )
    .unwrap();
    let tree: serde_json::Value = invoke(
        &webview,
        "list_workspace_tree",
        serde_json::json!({ "rootPath": root }),
    )
    .unwrap();
    assert!(!has_path(&tree["entries"], "note.md"));
    assert!(has_path(&tree["entries"], "folder/note.md"));
    assert!(!ws.root.join("note.md").exists());
    assert_eq!(
        fs::read_to_string(ws.root.join("folder/note.md")).unwrap(),
        "hello"
    );

    let trashed_path: String = invoke(
        &webview,
        "file_delete",
        serde_json::json!({ "rootPath": root, "path": "folder/note.md" }),
    )
    .unwrap();
    assert!(!ws.root.join("folder/note.md").exists());
    assert!(ws.root.join(&trashed_path).exists());
    let tree: serde_json::Value = invoke(
        &webview,
        "list_workspace_tree",
        serde_json::json!({ "rootPath": root }),
    )
    .unwrap();
    assert!(!has_path(&tree["entries"], "folder/note.md"));
    let trash_id = std::path::Path::new(&trashed_path)
        .file_name()
        .unwrap()
        .to_string_lossy();
    invoke::<()>(
        &webview,
        "file_restore_trash",
        serde_json::json!({ "rootPath": root, "id": trash_id }),
    )
    .unwrap();
    assert!(!ws.root.join(&trashed_path).exists());

    let tree: serde_json::Value = invoke(
        &webview,
        "list_workspace_tree",
        serde_json::json!({ "rootPath": root }),
    )
    .unwrap();
    assert!(has_path(&tree["entries"], "folder/note.md"));
    assert_eq!(
        fs::read_to_string(ws.root.join("folder/note.md")).unwrap(),
        "hello"
    );
}
