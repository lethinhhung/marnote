# Editor

## Requirements

- Edit Markdown with paragraph, heading, list, task, quote, code, table, and divider blocks.
- Preserve Markdown as the source of truth; avoid destructive round-trip changes and saving editor normalization.
- Support portable workspace links and external URLs. Detect external edits before replacing content.
- Keep note content independent of app metadata or a database.

## Implemented

- Tiptap provides formatted editing, Markdown source view, toolbar and `/` block insertion, and Markdown-aware paste.
- Tables have row, column, header, alignment, and resize controls. Code and blocks can be copied or dragged.
- Links can target workspace items or URLs. Hover actions copy, navigate, edit, or unlink.
- Drafts follow the saving behavior in [Saving](saving.md). Metadata and note statistics appear in the editor.
- Tiptap serializes Markdown; fidelity across all Markdown dialects is not guaranteed.
