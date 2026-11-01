use std::{
    fs,
    path::{Component, Path, PathBuf},
};

pub fn root(path: &str) -> Result<PathBuf, String> {
    let p = fs::canonicalize(path).map_err(|e| e.to_string())?;
    if !p.is_dir() {
        return Err("Workspace must be a directory".into());
    }
    Ok(p)
}

pub fn target(root: &Path, path: &str, exists: bool) -> Result<PathBuf, String> {
    let relative = Path::new(path);
    if relative.as_os_str().is_empty()
        || relative
            .components()
            .any(|c| !matches!(c, Component::Normal(_)))
    {
        return Err("Path must be a non-empty workspace-relative path".into());
    }
    let p = root.join(relative);
    let parent = fs::canonicalize(p.parent().ok_or("Invalid path")?).map_err(|e| e.to_string())?;
    if !parent.starts_with(root) {
        return Err("Path escapes workspace".into());
    }
    let p = parent.join(p.file_name().ok_or("Invalid path")?);
    if exists {
        if fs::symlink_metadata(&p)
            .map_err(|e| e.to_string())?
            .file_type()
            .is_symlink()
        {
            return Err("Symlinks are not supported".into());
        }
        if !fs::canonicalize(&p)
            .map_err(|e| e.to_string())?
            .starts_with(root)
        {
            return Err("Path escapes workspace".into());
        }
    }
    Ok(p)
}