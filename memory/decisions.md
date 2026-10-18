# Decisions

## Desktop code organization (feature-based)

- Source: `specs/core.md` — organize desktop UI by feature, keeping app composition, shared UI, and platform adapters separate; keep domain logic platform-independent.
- Layout for `apps/desktop/src`:
  - `app/` — composition and entry: `main.tsx`, `App.tsx`.
  - `features/workspace/` — workspace feature: `FileTree.tsx`, `TreeEditor.tsx`, `WorkspaceSidebar.tsx`, `useWorkspace.ts`, `workspaceTypes.ts`.
  - `features/editor/` — editor feature: `NoteEditor.tsx`, `EditorToolbar.tsx`, `NoteFooter.tsx`, `SlashMenu.tsx`, `BlockDragHandle.tsx`, `TableEdgeControls.tsx`, `blockDnd.ts`, `initialMarkdown.ts`, `tableResize.ts`, `useWideContent.ts`.
  - `shared/ui/` — reusable chrome components (currently `HeaderBar.tsx`).
  - `shared/theme/` — stylesheets and `useTheme.ts`.
  - `platform/` — Tauri adapter boundary: `workspace.ts`, `dialog.ts`, `window.ts`.
- The former `src/ui/` directory is retired; composition is no longer mixed with reusable UI.

## Workspace feature and adapter seam

- Source: `specs/core.md` — organize desktop UI by feature, keeping platform adapters separate.
- Workspace domain types (`Entry`, `WorkspaceTree`, and the unused `NoteData`) live in `features/workspace/workspaceTypes.ts`.
- Workspace UI, state, and types are grouped under `features/workspace/`; `App.tsx` imports `useWorkspace` and `WorkspaceSidebar` from `../features/workspace`.
- Filesystem access stays behind the adapter seam: `platform/workspace.ts` is the only Tauri `invoke` surface for workspace I/O and imports its `WorkspaceTree` type from the workspace feature. `useWorkspace` calls `platform/workspace` rather than `invoke` directly.
- `shared/ui/HeaderBar` (shared UI) imports workspace feature types, so the feature is a type source for shared chrome.

## Platform adapters

- Source: `specs/core.md` — keep platform adapters separate and domain logic platform-independent.
- `apps/desktop/src/platform/` is the single location permitted to import `@tauri-apps/*`. Modules:
  - `workspace.ts` — workspace filesystem I/O: `openWorkspace`, `openDefaultWorkspace`, `listWorkspace`, `readFile`, `writeFile`, `createFile`, `moveFile`, `deleteFile`, `createFolder`, plus `ReadResult`.
  - `dialog.ts` — desktop detection and folder picker: `isDesktop`, `openWorkspaceFolder`, `WorkspaceFolderPickerOptions`.
  - `window.ts` — window controls: `windowDragAvailable`, `startWindowDrag`.
- Feature/shared/app callers import these adapters: `app/App.tsx` and `features/workspace/useWorkspace.ts` use `platform/workspace`; `features/workspace/WorkspaceSidebar.tsx` uses `platform/dialog`; `shared/ui/HeaderBar.tsx` uses `platform/window`.
- The adapter depends on the workspace feature only for the `WorkspaceTree` type (accepted); platform behavior is otherwise unchanged.

## Editor feature

- Source: `specs/core.md` — organize desktop UI by feature while preserving Markdown serialization and editor interactions.
- Editor UI and supporting logic grouped under `apps/desktop/src/features/editor/`: components `NoteEditor`, `EditorToolbar`, `NoteFooter`, `SlashMenu`, `BlockDragHandle`, `TableEdgeControls`; helpers `blockDnd`, `initialMarkdown`, `tableResize`, `useWideContent`.
- The ten modules were pure renames (git similarity 97–100%) from `shared/ui/` and `shared/`; the only content changes are relative import specifiers.
- `App.tsx` imports the editor feature through `./features/editor/*`.
- Markdown serialization (`contentType 'markdown'`, `getMarkdown`/`onUpdate` wiring), drag-and-drop, table resizing, and slash-menu behavior are unchanged.
- `useWideContent.ts` keeps the `marnote-horizontal-scroll` localStorage key; `TableEdgeControls.tsx` is 119 lines, under the 120-line limit.

## Entry point

- `apps/desktop/index.html` references `/src/app/main.tsx`.
- `main.tsx` keeps both stylesheet imports (`shared/theme/styles.css`, `shared/theme/theme-dark.css`) and the `React.StrictMode` root render.
