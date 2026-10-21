# Explorer

## Tree

- The sidebar shows **My Notes**, recent workspaces, **Open workspace…**, and the active tree.
- The tree shows nested folders and Markdown notes. Folders expand/collapse; notes open and folders focus independently.
- Sort by **Name** (default, case-insensitive), **Recently modified** (newest first), or **Manual order**; folders appear before notes, with names breaking ties.
- In **Manual order**, drag siblings to reorder them; drops onto folders or the root move items. Other sort modes disable reordering.
- Save manual order per folder in `.marnote/metadata.json`. Switching sort modes preserves it; new or moved items append to the destination order, and deleted items are removed.
- **Hide folders without notes** filters empty folders for the current session.

## Actions

- Create notes and folders from the tree heading or context menu. Notes use the focused folder or current note's parent, open after creation, and avoid name collisions.
- Inline names submit with Enter and cancel with Escape or blur. Notes receive `.md` when omitted.
- Right-click an item or blank tree space for its menu. Actions include metadata edits, creation, rename, and trash. Deletion requires confirmation; folders include contents.
- Drag onto a folder to move inside, onto a note to place beside it, or onto blank space to move to root. Invalid and existing destinations are rejected. `⌘Z` / `Ctrl+Z` undoes a move outside text fields and the editor.

## Gaps

- No keyboard item moves or trash restore/empty controls.
