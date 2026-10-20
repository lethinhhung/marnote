use std::path::Path;

/// Markdown notes are matched case-insensitively, like the workspace tree does.
pub(super) fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("md"))
}
