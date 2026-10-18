# Notes

## app-and-shared-ui (attempt 1)

- Change was path-only: git diff limited to import-path and entry-point updates plus pure file renames; no product or behavior changes.
- Entry: `index.html` → `/src/app/main.tsx`; `main.tsx` preserves both stylesheet imports and `React.StrictMode` render.
- New locations:
  - `app/`: `main.tsx`, `App.tsx`, `useWorkspace.ts`.
  - `shared/ui/`: `BlockDragHandle`, `EditorToolbar`, `FileTree`, `HeaderBar`, `NoteEditor`, `NoteFooter`, `SlashMenu`, `TableEdgeControls`, `TreeEditor`, `WorkspaceSidebar`.
  - `shared/theme/`: `styles.css`, `theme-dark.css`, `useTheme.ts`.
  - `shared/`: `blockDnd.ts`, `initialMarkdown.ts`, `tableResize.ts`, `useWideContent.ts`, `workspaceApi.ts`, `workspaceTypes.ts`.
- No stale `src/ui` or `./ui` import references remain.

## workspace-feature (attempt 1)

- Change was import-path/relocation only; no product, spec, or behavior changes.
- Relocated into `features/workspace/`:
  - `FileTree.tsx`, `WorkspaceSidebar.tsx`, `useWorkspace.ts` (from `shared/ui/` and `app/`).
  - `TreeEditor.tsx` (already present in `features/workspace/` from the prior stage).
- `shared/workspaceTypes.ts` was moved and recreated as `features/workspace/workspaceTypes.ts`; `NoteData` is preserved but unused.
- Internal imports updated: `FileTree`/`WorkspaceSidebar` use `./workspaceTypes`; `useWorkspace` uses `./workspaceTypes` and `../../shared/workspaceApi`.
- Cross-boundary imports updated: `App.tsx` → `../features/workspace/{useWorkspace,WorkspaceSidebar}`; `HeaderBar.tsx` and `workspaceApi.ts` → `../features/workspace/workspaceTypes` / `../../features/workspace/workspaceTypes`.
- Behavior preserved because only import paths and file locations changed; selection, tree navigation, editing, drag-and-drop, and file operations untouched.
- Verified no stale references to `shared/workspaceTypes`, `shared/ui/FileTree`, `shared/ui/TreeEditor`, `shared/ui/WorkspaceSidebar`, or `app/useWorkspace`.

## editor-feature (attempt 1)

- Change was rename/import-path only; no product, spec, or behavior changes.
- Relocated into `features/editor/` (10 modules):
  - Components from `shared/ui/`: `NoteEditor`, `EditorToolbar`, `NoteFooter`, `SlashMenu`, `BlockDragHandle`, `TableEdgeControls`.
  - Helpers from `shared/`: `blockDnd.ts`, `initialMarkdown.ts`, `tableResize.ts`, `useWideContent.ts`.
- `git diff --cached -M` reports pure renames (R097–R100); content diffs are limited to import specifiers (`BlockDragHandle` → `./blockDnd`; `TableEdgeControls` → `./tableResize`; `NoteEditor` → `./EditorToolbar`, `./initialMarkdown`, `./SlashMenu`, `./BlockDragHandle`, `./TableEdgeControls`, `./tableResize`; `App.tsx` → `./features/editor/*`).
- Markdown serialization (`contentType 'markdown'`, `getMarkdown`/`onUpdate` wiring) and interaction logic untouched; `marnote-horizontal-scroll` key preserved in `useWideContent.ts:3`.
- Repo-wide grep for former shared paths returned no matches; `TableEdgeControls.tsx` is 119 lines.
- After this stage the only remaining `shared/ui` file is `HeaderBar.tsx` and `shared/workspaceApi.ts` remains the filesystem adapter.

## platform-adapters (attempt 1)

- Change isolated Tauri imports behind `apps/desktop/src/platform/`; no product, spec, or behavior changes.
- New modules: `platform/workspace.ts`, `platform/dialog.ts`, `platform/window.ts`.
- `platform/workspace.ts` replaces the deleted `shared/workspaceApi.ts` byte-for-byte: all nine Tauri command names (`open_workspace`, `default_workspace`, `list_workspace_tree`, `file_read_markdown`, `file_update_markdown`, `file_create_markdown`, `file_move`, `file_delete`, `folder_create`), argument casing, return types, and signatures preserved; zero remaining references to the old module.
- `platform/dialog.ts` wraps `isTauri` and `plugin-dialog` `open`; `platform/window.ts` wraps `isTauri` and `getCurrentWindow` (guard preserved, `startDragging` catches errors).
- Callers rewired: `app/App.tsx` and `features/workspace/useWorkspace.ts` → `../platform/workspace` / `../../platform/workspace`; `features/workspace/WorkspaceSidebar.tsx` → `../../platform/dialog`; `shared/ui/HeaderBar.tsx` → `../../platform/window`.
- Grep confirms all `@tauri-apps` imports (invoke, isTauri, getCurrentWindow, plugin-dialog) are confined to `apps/desktop/src/platform/`; no direct Tauri imports elsewhere.
- Behavior preserved in callers: non-desktop fallback message, picker title/defaultPath, string-only path check, and picker error text in `WorkspaceSidebar`; drag guard, `.global-search`/`button` exclusions, and Mac-titlebar detection in `HeaderBar`.
- Checks passed: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## desktop-integration (attempt 1)

- Change was type-relocation/import-path only; no product, spec, or behavior changes.
- New canonical module `apps/desktop/src/shared/domain/workspace.ts` declares `Entry` and `WorkspaceTree` with the exact same shapes previously in `features/workspace/workspaceTypes.ts`.
- `features/workspace/workspaceTypes.ts` reduced to re-exports plus unchanged `NoteData` (2 lines).
- Boundary imports rewired: `platform/workspace.ts:2` → `../shared/domain/workspace`; `shared/ui/HeaderBar.tsx:4` → `../domain/workspace`.
- Grep confirms no `features/` imports remain under `platform/` or `shared/`; `features/workspace` callers (`useWorkspace`, `WorkspaceSidebar`, `FileTree`) still import through `./workspaceTypes`.
- Checks passed: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`; focused `pnpm --filter @marnote/desktop typecheck`.
- `docs/temps/20261018031021-tl9be7.json` (modified in worktree) is coordinator run metadata, unrelated to the implementation.

## Unresolved / follow-ups

- Resolved in desktop-integration: `platform/workspace.ts` no longer imports workspace-feature types, and `shared/ui/HeaderBar` no longer imports from `features/` (both now use `shared/domain/workspace`).
- Watch item: `features/workspace/workspaceTypes.ts` still re-exports the shared domain types and keeps the unused `NoteData`; harmless but could be removed if no future consumer needs `NoteData`.
- No open findings from any stage.
