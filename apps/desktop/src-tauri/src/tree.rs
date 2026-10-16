use crate::workspace::Entry;
use std::path::Path;

pub fn collect(dir: &Path, base: &Path) -> Result<Vec<Entry>, String> {
    let mut out = Vec::new();
    for item in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let item = item.map_err(|e| e.to_string())?;
        let meta = item.file_type().map_err(|e| e.to_string())?;
        if meta.is_symlink() || item.file_name() == ".marnote-trash" {
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
                children,
            });
        }
    }
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}
