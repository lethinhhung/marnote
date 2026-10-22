use crate::workspace::Entry;
use std::path::Path;

pub fn collect(dir: &Path, base: &Path) -> Result<Vec<Entry>, String> {
    let mut out = Vec::new();
    for item in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let item = item.map_err(|e| e.to_string())?;
        let meta = item.file_type().map_err(|e| e.to_string())?;
        if meta.is_symlink()
            || item.file_name() == ".marnote-trash"
            || item.file_name() == ".marnote"
        {
            continue;
        }
        let p = item.path();
        let path = p
            .strip_prefix(base)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        let directory = meta.is_dir();
        let children = if directory {
            collect(&p, base)?
        } else {
            Vec::new()
        };
        let markdown = p
            .extension()
            .and_then(|s| s.to_str())
            .is_some_and(|s| s.eq_ignore_ascii_case("md"));
        if directory || markdown {
            out.push(Entry {
                name: item.file_name().to_string_lossy().into_owned(),
                path,
                kind: if directory { "directory" } else { "file" }.into(),
                is_empty: !directory
                    && std::fs::metadata(&p)
                        .map(|metadata| metadata.len() == 0)
                        .unwrap_or(true),
                modified_ms: std::fs::metadata(&p)
                    .and_then(|metadata| metadata.modified())
                    .ok()
                    .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|time| time.as_millis())
                    .unwrap_or_default(),
                children,
                metadata: None,
            });
        }
    }
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::os::unix::fs::symlink as unix_symlink;
    use std::path::PathBuf;

    fn create_temp_dir() -> PathBuf {
        let mut path = std::env::temp_dir();
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        path.push(format!(
            "marnote_tree_test_{}_{}",
            std::process::id(),
            nanos
        ));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).unwrap();
        path
    }

    fn create_file(dir: &PathBuf, name: &str, content: &str) {
        fs::write(dir.join(name), content).unwrap();
    }

    fn create_dir(dir: &PathBuf, name: &str) -> PathBuf {
        let path = dir.join(name);
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[cfg(unix)]
    fn create_symlink(dir: &PathBuf, name: &str, target: &PathBuf) {
        let _ = unix_symlink(target, dir.join(name));
    }

    #[cfg(windows)]
    fn create_symlink(dir: &PathBuf, name: &str, target: &PathBuf) {
        let _ = std::os::windows::fs::symlink_file(target, dir.join(name));
    }

    #[test]
    fn collect_includes_directories_and_markdown_files() {
        let temp = create_temp_dir();
        let base = temp.clone();

        create_file(&temp, "note.md", "# Note");
        create_file(&temp, "README.MD", "# Readme");
        create_file(&temp, "draft.Md", "# Draft");
        create_file(&temp, "script.rs", "fn main() {}");
        create_file(&temp, "data.json", "{}");
        create_dir(&temp, "folder");
        create_file(&temp.join("folder"), "inner.md", "# Inner");

        let entries = collect(&temp, &base).unwrap();

        let names: Vec<&str> = entries.iter().map(|e| e.name.as_str()).collect();
        assert_eq!(names, vec!["draft.Md", "folder", "note.md", "README.MD"]);

        let folder = entries.iter().find(|e| e.name == "folder").unwrap();
        assert_eq!(folder.kind, "directory");
        assert_eq!(folder.children.len(), 1);
        assert_eq!(folder.children[0].name, "inner.md");
    }

    #[test]
    fn collect_skips_symlinks() {
        let temp = create_temp_dir();
        let base = temp.clone();

        create_file(&temp, "note.md", "# Note");
        let target = std::env::temp_dir().join("marnote_test_target");
        let _ = fs::remove_dir_all(&target);
        fs::create_dir_all(&target).unwrap();
        create_file(&target, "target.md", "# Target");
        create_symlink(&temp, "link_to_dir", &target);
        create_symlink(&temp, "link_to_file.md", &temp.join("note.md"));

        let entries = collect(&temp, &base).unwrap();

        let names: Vec<&str> = entries.iter().map(|e| e.name.as_str()).collect();
        assert_eq!(names, vec!["note.md"]);
        let _ = fs::remove_dir_all(&target);
    }

    #[test]
    fn collect_skips_marnote_trash() {
        let temp = create_temp_dir();
        let base = temp.clone();

        create_file(&temp, "note.md", "# Note");
        let trash = create_dir(&temp, ".marnote-trash");
        create_file(&trash, "deleted_123_note.md", "# Deleted");

        let entries = collect(&temp, &base).unwrap();

        let names: Vec<&str> = entries.iter().map(|e| e.name.as_str()).collect();
        assert_eq!(names, vec!["note.md"]);
    }

    #[test]
    fn collect_sorts_case_insensitively() {
        let temp = create_temp_dir();
        let base = temp.clone();

        create_file(&temp, "zebra.md", "# Z");
        create_file(&temp, "alpha.md", "# A");
        create_file(&temp, "Beta.md", "# B");
        create_dir(&temp, "gamma");
        create_dir(&temp, "Delta");

        let entries = collect(&temp, &base).unwrap();

        let names: Vec<&str> = entries.iter().map(|e| e.name.as_str()).collect();
        assert_eq!(
            names,
            vec!["alpha.md", "Beta.md", "Delta", "gamma", "zebra.md"]
        );
    }

    #[test]
    fn collect_recursive_sorting() {
        let temp = create_temp_dir();
        let base = temp.clone();

        let folder = create_dir(&temp, "folder");
        create_file(&folder, "zebra.md", "# Z");
        create_file(&folder, "alpha.md", "# A");

        let entries = collect(&temp, &base).unwrap();

        let folder_entry = entries.iter().find(|e| e.name == "folder").unwrap();
        let child_names: Vec<&str> = folder_entry
            .children
            .iter()
            .map(|e| e.name.as_str())
            .collect();
        assert_eq!(child_names, vec!["alpha.md", "zebra.md"]);
    }

    #[test]
    fn collect_empty_directory() {
        let temp = create_temp_dir();
        let base = temp.clone();

        let entries = collect(&temp, &base).unwrap();
        assert!(entries.is_empty());
    }

    #[test]
    fn collect_only_non_markdown_files() {
        let temp = create_temp_dir();
        let base = temp.clone();

        create_file(&temp, "script.rs", "fn main() {}");
        create_file(&temp, "data.json", "{}");
        create_file(&temp, "image.png", "binary");

        let entries = collect(&temp, &base).unwrap();
        assert!(entries.is_empty());
    }
}
