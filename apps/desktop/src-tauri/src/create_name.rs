pub(crate) fn with_suffix(path: &str, suffix: u32, markdown: bool) -> String {
    let (parent, name) = path.rsplit_once('/').unwrap_or(("", path));
    let (stem, extension) = if markdown {
        name.strip_suffix(".md")
            .map(|stem| (stem, ".md"))
            .unwrap_or((name, ""))
    } else {
        (name, "")
    };
    let filename = format!("{stem}-{suffix}{extension}");
    if parent.is_empty() {
        filename
    } else {
        format!("{parent}/{filename}")
    }
}

#[cfg(test)]
#[path = "create_name_tests.rs"]
mod tests;
