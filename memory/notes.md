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

## Unresolved / follow-ups

- `shared/workspaceApi.ts` relocation to a platform-adapters location is deferred (planned for a later stage); currently consistent with the plan.
- `workspaceTypes.ts` is a feature module consumed by `shared/ui/HeaderBar`, a shared→feature type dependency to watch if features multiply.
- No open findings from any stage.
