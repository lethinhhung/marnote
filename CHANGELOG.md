# Changelog

Notable user-facing changes are recorded here for each release. Add a dated version section before creating its release tag, using `## [X.Y.Z] - YYYY-MM-DD`.

## Unreleased

## [0.5.0] - 2026-11-26

### Added

- Insert emoji from the editor picker or by typing a recognized shortcode; emoji are saved as standard Unicode text in Markdown.
- Configure the read-only MCP server with a guided setup prompt or manual client instructions, and browse workspace entries in pages.
- Add search and social sharing metadata, a web app manifest, and a social preview image to the web app.

### Improved

- Restrict MCP browsing to visible workspace files, omit symlinks and hidden entries, and bound note reads and search results.
- Improve workspace navigation and search behavior across desktop and web.

### Compatibility

- Markdown workspaces need no migration. MCP `list_workspace` now returns paginated results with `entries` and `nextOffset`; clients using its former array response should update to the new shape. Web notes remain stored in the browser profile and do not sync with desktop workspaces. macOS builds remain ad-hoc signed and not notarized, so first launch may require approval in Privacy & Security settings.

## [0.4.1] - 2026-11-20

### Added

- Use Marnote in a browser with local, offline-capable notes, Markdown export, and workspace import and export.
- Open a backlinks panel to find notes that link to the current note.

### Improved

- Refresh workspaces when files change outside Marnote, show workspace names when no note is open, and improve notification and editor behavior.
- Deploy the web demo from stable releases on `main`.

### Compatibility

- Desktop workspaces need no migration. Web notes are stored in the browser profile for that site and do not sync with desktop workspaces; export a backup to move them between browsers. macOS builds remain ad-hoc signed and not notarized, so first launch may require approval in Privacy & Security settings.

## [0.4.0] - 2026-11-03

### Added

- Connect read-only MCP clients to search and read notes in a workspace.
- Adjust editor zoom and keep the chosen size across app restarts.

### Improved

- Keep note footer controls usable in narrow windows and improve breadcrumb menus and copy controls.

### Compatibility

- Existing Markdown workspaces need no migration. macOS builds remain ad-hoc signed and not notarized; first launch may require approval in Privacy & Security settings.

## [0.3.0] - 2026-10-26

### Added

- Choose Automatic or Manual saving, restore open note tabs and drafts per workspace, and resolve unsaved notes before closing tabs or switching workspaces.
- Search notes by content and metadata, open workspace links to notes or folders, and use quick actions from search results.
- Reorder and resize the Explorer, focus folders from the path bar, and create notes and folders with safer duplicate-name handling.

### Improved

- Protect drafts from external file changes and editor normalization, with clearer save status and recovery behavior.
- Improve Markdown editing, table controls, link previews, and keyboard navigation across the editor and workspace.

### Compatibility

- Workspaces remain folders of Markdown files; no workspace migration is required. macOS builds are ad-hoc signed and not notarized, so first launch may require approval in Privacy & Security settings.

## [0.2.0] - 2026-10-22

### Added

- Search notes by title, folder, tags, and content, with quick capture and contextual actions.
- Open notes in tabs, reorder Explorer items, resize the sidebar, and focus folders from the path bar.
- Copy note links and paths, and paste copied note links as formatted Markdown links.
- Move files and folders to the system trash and restore a more reliable autosave flow.

### Improved

- Refine the editor toolbar and header for narrow windows and long folder paths.
- Improve Explorer drag and drop, folder navigation, and search result actions.

## [0.1.0] - 2026-10-21

### Added

- Initial Marnote desktop release for macOS, Windows, and Linux.
- Local Markdown workspaces with a block editor, nested folders, tags, favorites, and offline search.
- Open existing project folders and keep notes in standard Markdown files.

### Fixed

- Ad-hoc sign the macOS app bundle so Gatekeeper no longer treats it as unsigned. First launch may still require approval in Privacy & Security settings.
