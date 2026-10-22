# Workspace

## Requirements

- A workspace is a local directory. **My Notes** lives in app data; other folders open without migration.
- Markdown files and directories map to notes and folders. The filesystem remains the source of truth.
- Create, rename, move, and trash items without overwriting existing paths. Preserve metadata when moving.
- Deletions go to hidden workspace-local `.marnote-trash`.
- Restore trashed items to their original paths and permanently empty the workspace trash.
- Detect external edits to the open note and let users load the disk version or keep their draft.

## Implemented

- Startup reopens the latest workspace or falls back to **My Notes**. Recent paths use local storage.
- The tree shows Markdown files and folders, hides other files and symlinks, and checks paths against traversal.
- Create, move, rename, trash, restore, and empty trash use filesystem operations. Trash is hidden from the tree and managed through the Explorer.
- Older trash entries without saved original paths can be permanently deleted but cannot be restored.
- The open note is checked for external changes every 2.5 seconds; users can load the disk version or keep their draft.
- Git and configurable ignore rules are not exposed.
