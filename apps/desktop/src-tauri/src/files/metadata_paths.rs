use crate::metadata::{EntryMetadata, WorkspaceMetadata};
use std::collections::HashMap;

pub(super) fn rebase_metadata_paths(
    store: &WorkspaceMetadata,
    source: &str,
    destination: &str,
) -> HashMap<String, EntryMetadata> {
    let source = source.trim_end_matches('/');
    let destination = destination.trim_end_matches('/');
    store
        .entries
        .iter()
        .map(|(path, metadata)| {
            let rebased = if path == source {
                destination.to_string()
            } else if path.starts_with(&format!("{source}/")) {
                format!("{destination}{}", &path[source.len()..])
            } else {
                path.clone()
            };
            (rebased, metadata.clone())
        })
        .collect()
}

pub(super) fn filter_metadata_for_delete(
    store: &WorkspaceMetadata,
    path: &str,
) -> HashMap<String, EntryMetadata> {
    let path = path.trim_end_matches('/');
    store
        .entries
        .iter()
        .filter(|(entry_path, _)| {
            *entry_path != path && !entry_path.starts_with(&format!("{path}/"))
        })
        .map(|(entry_path, metadata)| (entry_path.clone(), metadata.clone()))
        .collect()
}
