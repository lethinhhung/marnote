# Explorer

## Tree

- The sidebar shows **My Notes**, recent workspaces, **Open workspace…**, and the active tree.
- The tree shows nested folders and Markdown notes. Folders expand/collapse; notes open and folders focus independently. Focusing a folder expands its ancestors without reopening the folder itself.
- Sort by **Name** (default, case-insensitive), **Recently modified** (newest first), or **Manual order**; folders appear before notes, with names breaking ties.
- In **Manual order**, drag siblings to reorder them; drops onto folders or the root move items. Other sort modes disable reordering.
- Save manual order per folder in `.marnote/metadata.json`. Switching sort modes preserves it; new or moved items append to the destination order, and deleted items are removed.
- **Hide folders without notes** filters empty folders for the current session.

## Actions

- Create notes and folders from the tree heading or context menu. Notes use the focused folder or current note's parent, open after creation, and avoid name collisions.
- Inline names submit with Enter and cancel with Escape or blur. Notes receive `.md` when omitted.
- Right-click an item or blank tree space for its menu. Actions include metadata edits, creation, rename, and trash. Deletion requires confirmation; folders include contents.
- Move an item with **Move to folder…** from its context menu; open the menu with right-click, the Context Menu key, or `Shift+F10`. Choose the workspace root or a folder. Moving rejects existing paths and moving a folder into itself or a descendant.
- The **Workspace trash** control lists deleted items. Restore an item to its original path or empty the workspace trash permanently, with confirmation.
- Trash items created by older versions without saved original paths can be emptied but not restored.
- Drag onto a folder to move inside, onto a note to place beside it, or onto blank space to move to root. Invalid and existing destinations are rejected. `⌘Z` / `Ctrl+Z` undoes a move outside text fields and the editor.

## Sidebar size and visibility

- Default to 260 px; allow dragging between 200 and 420 px, constrained by available window space.
- Provide a persistent **Show/Hide Explorer** control and `⌘⇧B` / `Ctrl+Shift+B` shortcut.
- Persist width and collapsed state across workspaces and restarts. Collapsing preserves the last expanded width.
- Make the divider keyboard accessible: vertical `separator` named **Resize Explorer**, with current/min/max values. Left/Right resize by 10 px; Shift+Left/Right by 40 px; Home collapses, End sets maximum, and Enter toggles collapse.
- Collapse Explorer to one icon in a 48 px column. Hovering or focusing the column reveals the full tree over the workspace at its saved width; leaving hides it again. Preserve folder expansion state. Clicking the icon or using the header toggle expands it persistently.
- Keep workspace controls fixed while the folder and note list scrolls independently.
- Use a 24 CSS px minimum pointer target and visible focus/drag states. Follow the [WAI-ARIA splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) and [WCAG target-size guidance](https://www.w3.org/TR/WCAG22/#target-size-minimum).
