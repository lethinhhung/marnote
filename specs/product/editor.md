# Editor

## Requirements

- Edit Markdown with paragraph, heading, list, task, quote, code, table, and divider blocks.
- Preserve Markdown as the source of truth; avoid destructive round-trip changes and saving editor normalization.
- Support separate portable workspace item links to notes/folders and external web address links. Resolve workspace links from the current note; moves do not rewrite links. Detect external edits before replacing content.
- Keep note content independent of app metadata or a database.

## Implemented

- Tiptap provides formatted editing, Markdown source view, toolbar and `/` block insertion, and Markdown-aware paste.
- Tables have row, column, header, alignment, and resize controls. Code and blocks can be copied or dragged.
- Links can target workspace notes, folders, or web URLs. Workspace links open notes or focus folders; missing targets remain identifiable and editable. Hover actions show a readable destination and offer open, copy, edit, or remove actions.
- Drafts follow the saving behavior in [Saving](saving.md). Metadata and note statistics appear in the editor.
- Tiptap serializes Markdown; fidelity across all Markdown dialects is not guaranteed.
