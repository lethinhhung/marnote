use super::with_suffix;

#[test]
fn suffixes_markdown_filename_inside_parent_directory() {
    assert_eq!(with_suffix("notes/draft.md", 1, true), "notes/draft-1.md");
}

#[test]
fn suffixes_markdown_without_an_extension() {
    assert_eq!(with_suffix("draft", 2, true), "draft-2");
}

#[test]
fn suffixes_non_markdown_name_without_changing_its_extension_like_text() {
    assert_eq!(with_suffix("archive.tar", 3, false), "archive.tar-3");
}

#[test]
fn suffixes_only_the_final_markdown_extension() {
    assert_eq!(with_suffix("notes/draft.md.backup", 4, true), "notes/draft.md.backup-4");
}
