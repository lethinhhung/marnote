use crate::{
    metadata,
    workspace::{root, target},
};
use std::{
    fs,
    io::Write,
    time::{SystemTime, UNIX_EPOCH},
};

fn current_timestamp_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

pub fn create_markdown(root_path: &str, path: &str, content: &str) -> Result<String, String> {
    let r = root(root_path)?;
    if std::path::Path::new(path)
        .extension()
        .and_then(|s| s.to_str())
        != Some("md")
    {
        return Err("Expected a .md path".into());
    }
    let mut suffix = 0;
    let (mut f, created_path) = loop {
        let candidate = if suffix == 0 {
            path.to_owned()
        } else {
            crate::create_name::with_suffix(path, suffix, true)
        };
        let p = target(&r, &candidate, false)?;
        match fs::OpenOptions::new().write(true).create_new(true).open(&p) {
            Ok(file) => break (file, candidate),
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => suffix += 1,
            Err(error) => return Err(error.to_string()),
        }
    };
    f.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    f.sync_all().map_err(|e| e.to_string())?;

    let now = current_timestamp_ms();
    let meta = metadata::EntryMetadata {
        created_ms: Some(now),
        updated_ms: Some(now),
        ..Default::default()
    };
    metadata::update_metadata(&r, &created_path, meta)
        .map_err(|e| format!("Metadata write failed: {}", e))?;

    Ok(created_path)
}
