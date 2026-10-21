# Search & Links

## Requirements

- Search offline across titles, paths, folders, and note content.
- Support portable internal links and backlinks.
- Any search index or link graph is rebuildable; Markdown remains canonical.

## Implemented

- `⌘K` / `Ctrl+K` opens title-and-path search; up to eight Markdown matches are shown. Enter opens the first.
- Content search, folder results, commands, and backlinks are not implemented.
- The editor creates relative workspace links and resolves them against the current tree. Moves do not rewrite existing links.
