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

## Unresolved / follow-ups

- `shared/workspaceApi.ts` relocation to a platform-adapters location is deferred (planned for a later stage); currently consistent with the plan.
- No open findings from this stage.
