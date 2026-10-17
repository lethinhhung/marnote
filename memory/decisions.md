# Decisions

## D-001 Feature-based desktop layout (stage `workspace-adapters`)

The desktop app organizes code by responsibility instead of a flat `src/ui/` directory,
following `specs/core.md` (Architecture: "UI should not directly own filesystem logic";
"Platform-specific functionality should stay behind adapters").

Established boundaries:

- `apps/desktop/src/features/workspace/` — workspace feature state and shared types.
  - `types.ts` holds `Entry`, `WorkspaceTree`, `NoteData`.
  - `useWorkspace.ts` owns workspace state and operations.
- `apps/desktop/src/platform/` — platform adapters.
  - `workspaceApi.ts` is the only module importing Tauri `invoke`; it wraps all
    workspace/filesystem commands.
  - `desktopUi.ts` wraps desktop-only UI capabilities: `isDesktopApp` (`isTauri`),
    `pickWorkspaceDirectory` (dialog plugin), and `startWindowDragging` (window API).

## D-002 Tauri access confined to the platform adapter

All Tauri command access stays behind `platform/workspaceApi.ts`. UI components import
from the adapter rather than `@tauri-apps/api` or `@tauri-apps/plugin-dialog` directly.
`HeaderBar` and `WorkspaceSidebar` now consume `desktopUi` helpers instead of inline
Tauri calls. This preserves the adapter boundary for future non-desktop clients.

## D-003 Move-only refactor, no behavior change

The change is import-path-only plus extraction of inline Tauri calls into `desktopUi`
helpers with identical runtime behavior. Command names, argument mappings, pointer
conditions, and error handling are unchanged. `types.ts` is byte-identical to the
former `workspaceTypes.ts`.

## D-004 File-tree interactions grouped as a feature (stage `file-tree-feature`)

File browsing, selection, and tree-editing interactions live together under
`apps/desktop/src/features/file-tree/`, following `specs/core.md` (Architecture:
"Organize desktop UI code by feature, keeping app composition, shared UI, and platform
adapters separate").

Feature contents:

- `FileTree.tsx` — tree rendering, drag-to-move, context targeting, inline tree editor.
- `TreeEditor.tsx` — the inline note/folder name editor.
- `WorkspaceSidebar.tsx` — sidebar composition, workspace switching, create/rename/
  delete actions, and the folder context menu.

Dependencies point outward to prior stages, not inward to the platform:

- Workspace data/types come from `../workspace/types` (`Entry`, `WorkspaceTree`).
- Desktop-only capabilities come from `../../platform/desktopUi`
  (`isDesktopApp`, `pickWorkspaceDirectory`).
- The feature owns no native filesystem or Tauri access; all I/O flows through the
  existing workspace callbacks (`onOpen`, `onMove`, `onCreate`, `onRename`,
  `onDelete`) passed down from `App.tsx`.

`App.tsx` (app composition, still in `src/ui/`) imports the sidebar from
`../features/file-tree/WorkspaceSidebar`; no imports point back into the feature.

## D-005 Note-editor grouped as a feature (stage `note-editor-feature`)

The editor, its toolbar and menus, and editor-only helpers live together under
`apps/desktop/src/features/note-editor/`, following `specs/core.md` (Architecture:
"Organize desktop UI code by feature, keeping app composition, shared UI, and platform
adapters separate as the app grows").

Feature contents (all move-only from the former `src/ui/`):

- `NoteEditor.tsx` — editor surface and composition of the toolbar, slash menu, block
  handle, and table controls.
- `EditorToolbar.tsx` — formatting toolbar.
- `SlashMenu.tsx` — slash-command menu and matching helper.
- `BlockDragHandle.tsx` — top-level block drag handle.
- `TableEdgeControls.tsx` — table row/column edge controls.
- `blockDnd.ts`, `tableResize.ts`, `initialMarkdown.ts` — editor-only helpers.

Boundaries:

- The feature is self-contained: every intra-feature import resolves with `./`; it has
  no workspace, platform, or Tauri dependency.
- `App.tsx:5` composes it via `../features/note-editor/NoteEditor`; props and call site
  are unchanged. No imports point back into the feature, and no `ui/<editor>` references
  remain anywhere in `apps/desktop`.

## D-006 App composition separated from shared UI (stage `app-shell-shared-ui`)

App composition and shared display components now have distinct locations, completing
the three-way split required by `specs/tech.md` ("Organize desktop UI code by feature,
keeping app composition, shared UI, and platform adapters separate").

- `apps/desktop/src/app/` — app composition. `App.tsx` (moved from `src/ui/App.tsx`)
  owns top-level state, autosave, external-change detection, and layout composition. It
  imports features from `../features/*`, shared UI from `../ui/*`, and the adapter from
  `../platform/workspaceApi`.
- `apps/desktop/src/ui/` — shared UI: `HeaderBar.tsx`, `NoteFooter.tsx`, `useTheme.ts`,
  `useWideContent.ts`, plus global `styles.css` and `theme-dark.css`. These are
  cross-feature display/style modules, not feature- or app-specific.
- `apps/desktop/src/main.tsx` — entry point imports `App` from `./app/App` and still
  loads `./ui/styles.css` and `./ui/theme-dark.css`.
- `apps/desktop/src/features/` — feature code (workspace, file-tree, note-editor).

`src/ui/App.tsx` is removed; no stale `ui/App` references remain. This stage is
move-only plus import-path updates: no behavior change.
