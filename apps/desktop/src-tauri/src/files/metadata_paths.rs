use crate::metadata::{EntryMetadata, WorkspaceMetadata};
use std::collections::HashMap;

fn rebase(path: &str, source: &str, destination: &str) -> String {
    if path == source {
        destination.into()
    } else if path.starts_with(&format!("{source}/")) {
        format!("{destination}{}", &path[source.len()..])
    } else {
        path.into()
    }
}

pub(super) fn rebase_manual_order(
    store: &WorkspaceMetadata,
    source: &str,
    destination: &str,
) -> HashMap<String, Vec<String>> {
    let source = source.trim_end_matches('/');
    let destination = destination.trim_end_matches('/');
    let mut order: HashMap<String, Vec<String>> = store
        .manual_order
        .iter()
        .map(|(parent, paths)| {
            (
                rebase(parent, source, destination),
                paths
                    .iter()
                    .map(|path| rebase(path, source, destination))
                    .collect(),
            )
        })
        .collect();
    let old_parent = std::path::Path::new(source)
        .parent()
        .unwrap_or(std::path::Path::new(""))
        .to_string_lossy()
        .replace('\\', "/");
    let new_parent = std::path::Path::new(destination)
        .parent()
        .unwrap_or(std::path::Path::new(""))
        .to_string_lossy()
        .replace('\\', "/");
    if let Some(paths) = order.get_mut(&old_parent) {
        paths.retain(|path| path != destination);
    }
    let destination_order = order.entry(new_parent).or_default();
    destination_order.retain(|path| path != destination);
    destination_order.push(destination.into());
    order
}

pub(super) fn filter_manual_order(
    store: &WorkspaceMetadata,
    path: &str,
) -> HashMap<String, Vec<String>> {
    let path = path.trim_end_matches('/');
    store
        .manual_order
        .iter()
        .filter(|(parent, _)| *parent != path && !parent.starts_with(&format!("{path}/")))
        .map(|(parent, paths)| {
            (
                parent.clone(),
                paths
                    .iter()
                    .filter(|item| *item != path && !item.starts_with(&format!("{path}/")))
                    .cloned()
                    .collect(),
            )
        })
        .collect()
}

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
            let rebased = rebase(path, source, destination);
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
