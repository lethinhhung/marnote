# Progress

## Stage `workspace-adapters` — passed (attempt 1)

Objective: move workspace state, API access, and shared workspace types out of the flat
UI directory into clear workspace and platform-adapter boundaries.

Outcome:

- Added `features/workspace/types.ts` and `features/workspace/useWorkspace.ts`.
- Added `platform/workspaceApi.ts` and `platform/desktopUi.ts`.
- Deleted flat modules `src/ui/useWorkspace.ts`, `src/ui/workspaceApi.ts`,
  `src/ui/workspaceTypes.ts`; no remaining references.
- Repointed UI imports in `App.tsx`, `FileTree.tsx`, `HeaderBar.tsx`,
  `WorkspaceSidebar.tsx`.

Evidence: all supplied checks passed — `pnpm run test`, `pnpm run lint`,
`pnpm run typecheck`, `pnpm run build`. Tester and Validator both reported pass
(4/4, 3/3, and 1/1 task validations across attempts). `invoke` is imported only in
`platform/workspaceApi.ts`.

Caveats:

- None affecting implementation. The run record
  `docs/temps/20261017155756-qspqxl.json` listed this stage `in_progress` at capture
  time; that is coordinator bookkeeping, not an implementation defect.

## Stage `file-tree-feature` — passed (attempt 1)

Objective: group workspace browsing, selection, and file-tree interactions as a focused
feature that uses the workspace/platform interfaces from the preceding stage.

Outcome:

- Moved `FileTree.tsx`, `TreeEditor.tsx`, and `WorkspaceSidebar.tsx` from
  `apps/desktop/src/ui/` into `apps/desktop/src/features/file-tree/`; deleted the old
  `ui/` copies.
- Repointed `App.tsx:4` to import `WorkspaceSidebar` from
  `../features/file-tree/WorkspaceSidebar`.
- Internal imports use `../workspace/types`, `./TreeEditor`/`./FileTree`, and
  `../../platform/desktopUi`. No stale `ui/` references remain.
- The feature has no native filesystem or Tauri access (`node:fs`/`@tauri-apps` absent);
  all I/O stays behind the workspace callbacks (see D-004).

Evidence: all supplied checks passed — `pnpm run test`, `pnpm run lint`,
`pnpm run typecheck`, `pnpm run build`. Tester and Validator both reported pass
(1/1 task validation). Files stay under the 120-line limit (FileTree 95, TreeEditor 15,
WorkspaceSidebar 74, App 56).

Caveats:

- None affecting implementation. Files were still staged/uncommitted at archive time.

## Stage `note-editor-feature` — passed (attempt 1)

Objective: group the editor, its toolbar and menus, and editor-specific helpers into a
focused feature while preserving Markdown behavior.

Outcome:

- Moved `NoteEditor.tsx`, `EditorToolbar.tsx`, `SlashMenu.tsx`, `BlockDragHandle.tsx`,
  `TableEdgeControls.tsx`, `blockDnd.ts`, `tableResize.ts`, and `initialMarkdown.ts`
  from `apps/desktop/src/ui/` into `apps/desktop/src/features/note-editor/`; deleted
  the old `ui/` copies.
- Repointed `App.tsx:5` to import `NoteEditor` from
  `../features/note-editor/NoteEditor`; props and call site unchanged.
- All intra-feature imports are feature-local (`./`); the feature has no workspace,
  platform, or Tauri dependency (see D-005).

Evidence: all supplied checks passed on attempt 1 — `pnpm run test`, `pnpm run lint`,
`pnpm run typecheck`, `pnpm run build`. Tester reported pass and Validator passed 3/3
task validations. No stale `ui/<editor>` references remain in `apps/desktop`. Files stay
under the 120-line limit (largest: TableEdgeControls at 119 lines; all others smaller).

Caveats:

- None affecting implementation. Changes were still staged/uncommitted at archive time.

## Stage `app-shell-shared-ui` — passed (attempt 1)

Objective: give app composition, shared UI, and feature code distinct locations and
integrate the reorganized workspace and editor features via the entry point.

Outcome:

- Moved `App.tsx` from `apps/desktop/src/ui/` to `apps/desktop/src/app/` (git recorded
  as a rename); `src/ui/App.tsx` is removed.
- `main.tsx:3` now imports `App` from `./app/App`; it still loads `./ui/styles.css`
  and `./ui/theme-dark.css`.
- `src/ui/` retains only shared UI: `HeaderBar.tsx`, `NoteFooter.tsx`, `useTheme.ts`,
  `useWideContent.ts`, `styles.css`, `theme-dark.css`.
- `app/App.tsx` resolves `../ui/*` (theme/header/footer/wide-content), `../features/*`,
  and `../platform/workspaceApi`. No stale `ui/App` references remain.

Evidence: all supplied checks passed — `pnpm run test`, `pnpm run lint`,
`pnpm run typecheck`, `pnpm run build`. Tester reported pass and Validator passed
1/1 task validations. Files stay under the 120-line limit (App 56, HeaderBar 31,
NoteFooter 11, useTheme 19, useWideContent 9).

Caveats:

- None affecting implementation. Changes were still staged/uncommitted at archive time.
