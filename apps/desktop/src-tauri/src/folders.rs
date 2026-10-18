use crate::metadata::{EntryMetadata, update_metadata, read_metadata};
use crate::workspace::{root, target};
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
pub fn folder_create(root_path: String, path: String) -> Result<(), String> {
    let workspace = root(&root_path)?;
    let folder = target(&workspace, &path, false)?;
    fs::create_dir(&folder).map_err(|error| error.to_string())?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let metadata = EntryMetadata {
        created_ms: Some(now),
        updated_ms: Some(now),
        ..Default::default()
    };

    if let Err(error) = update_metadata(&workspace, &path, metadata) {
        let cleanup = fs::remove_dir(&folder);
        return match cleanup {
            Ok(()) => Err(error),
            Err(cleanup_error) => Err(format!(
                "{error}; failed to remove newly created folder: {cleanup_error}"
            )),
        };
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_WS_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_workspace() -> PathBuf {
        let mut base = std::env::temp_dir();
        base.push(format!("marnote-folder-test-{}", std::process::id()));
        let counter = TEST_WS_COUNTER.fetch_add(1, Ordering::Relaxed);
        base.push(format!(
            "ws-{}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            counter
        ));
        fs::create_dir_all(&base).unwrap();
        base
    }

    fn ws_root(path: &PathBuf) -> String {
        path.to_string_lossy().into_owned()
    }

    #[test]
    fn folder_create_persists_metadata_with_timestamps() {
        let ws = temp_workspace();
        folder_create(ws_root(&ws), "new_folder".into()).unwrap();

        let folder_path = ws.join("new_folder");
        assert!(folder_path.exists());
        assert!(folder_path.is_dir());

        let metadata = read_metadata(&ws).unwrap();
        let entry = metadata.entries.get("new_folder").unwrap();
        assert!(entry.created_ms.is_some());
        assert!(entry.updated_ms.is_some());
        assert_eq!(entry.created_ms, entry.updated_ms);
    }

    #[test]
    fn folder_create_preserves_existing_metadata() {
        let ws = temp_workspace();
        let marnote_dir = ws.join(".marnote");
        fs::create_dir_all(&marnote_dir).unwrap();
        let json = r#"{"entries": {"existing.md": {"favorite": true}}}"#;
        fs::write(marnote_dir.join("metadata.json"), json).unwrap();

        folder_create(ws_root(&ws), "new_folder".into()).unwrap();

        let metadata = read_metadata(&ws).unwrap();
        assert_eq!(metadata.entries.len(), 2);
        assert!(metadata.entries["existing.md"].favorite());
        assert!(metadata.entries["new_folder"].created_ms.is_some());
        assert!(metadata.entries["new_folder"].updated_ms.is_some());
    }

    #[test]
    fn folder_create_returns_metadata_write_failure() {
        let ws = temp_workspace();
        let marnote_dir = ws.join(".marnote");
        fs::create_dir_all(&marnote_dir).unwrap();
        fs::write(marnote_dir.join("metadata.json"), "{ broken").unwrap();

        let result = folder_create(ws_root(&ws), "new_folder".into());
        assert!(result.is_err());

        let folder_path = ws.join("new_folder");
        assert!(!folder_path.exists());
    }
}
