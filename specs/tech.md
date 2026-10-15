## Technology Stack

- Desktop application: Tauri v2.
- Frontend: React, TypeScript, and Vite.
- UI: Tailwind CSS and shadcn/ui.
- Editor: Tiptap.
- Application state: Zustand.

## Core Constraints

- The app must be local-first and work offline.
- The filesystem is the source of truth for workspace content.
- Notes are stored as standard Markdown files.
- Workspaces support nested folders and links between notes.
- Markdown must remain portable and round-trip through the editor without destructive changes.

## Application Architecture

- Tauri and Rust provide filesystem access, file watching, Git operations, and native integrations.
- React owns the user interface, editor, and application state.
- Keep domain logic independent of the desktop platform so it can be reused by future mobile clients.
- UI and MCP operations must use the same workspace and filesystem services.

## Indexing and File Changes

- Maintain a local index for search and derived metadata.
- The index must be rebuildable from workspace files and must not become a source of truth.
- Detect external file changes and synchronize them safely with the app.

## MCP

- Provide an MCP server for workspace browsing, reading, searching, and writing.
- MCP operations use the same Markdown and filesystem model as the UI.
- Writes must be explicit and auditable.

## Git and Data Safety

- Git is an optional, first-class feature for workspaces that use it.
- Never overwrite user files silently.
- Perform Git actions only in response to explicit user intent.
