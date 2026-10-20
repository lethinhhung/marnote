use super::{file_create_markdown, file_read_markdown, file_update_markdown};
use std::{fs, path::PathBuf, sync::atomic::{AtomicU64, Ordering}};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn workspace() -> PathBuf {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let path = std::env::temp_dir().join(format!("marnote-extension-{id}"));
    if path.exists() {
        fs::remove_dir_all(&path).unwrap();
    }
    fs::create_dir_all(&path).unwrap();
    path
}

fn root(path: &PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

#[test]
fn uppercase_markdown_extension_is_readable_and_updatable() {
    let ws = workspace();
    fs::write(ws.join("README.MD"), "hello").unwrap();

    assert!(
        file_read_markdown(root(&ws), "README.MD".into()).is_ok(),
        "uppercase .MD files are listed in the tree and must be readable"
    );

    file_update_markdown(root(&ws), "README.MD".into(), "updated".into(), "hello".into()).unwrap();
    assert_eq!(fs::read_to_string(ws.join("README.MD")).unwrap(), "updated");
}

#[test]
fn mixed_case_markdown_extension_can_be_created() {
    let ws = workspace();

    file_create_markdown(root(&ws), "Draft.Md".into(), "body".into()).unwrap();
    assert_eq!(fs::read_to_string(ws.join("Draft.Md")).unwrap(), "body");
}

#[test]
fn non_markdown_extension_is_still_rejected() {
    let ws = workspace();
    fs::write(ws.join("notes.txt"), "hello").unwrap();

    assert!(file_read_markdown(root(&ws), "notes.txt".into()).is_err());
    assert!(file_create_markdown(root(&ws), "notes.txt".into(), "hello".into()).is_err());
}
