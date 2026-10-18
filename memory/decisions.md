# Decisions

## Desktop code organization (feature-based)

- Source: `specs/core.md` — organize desktop UI by feature, keeping app composition, shared UI, and platform adapters separate; keep domain logic platform-independent.
- Layout for `apps/desktop/src`:
  - `app/` — composition and entry: `main.tsx`, `App.tsx`.
  - `features/workspace/` — workspace feature: `FileTree.tsx`, `TreeEditor.tsx`, `WorkspaceSidebar.tsx`, `useWorkspace.ts`, `workspaceTypes.ts`.
  - `shared/ui/` — reusable chrome components.
  - `shared/theme/` — stylesheets and `useTheme.ts`.
  - `shared/` — cross-cutting helpers (`blockDnd.ts`, `tableResize.ts`, `initialMarkdown.ts`, `useWideContent.ts`, `workspaceApi.ts`).
- The former `src/ui/` directory is retired; composition is no longer mixed with reusable UI.

## Workspace feature and adapter seam

- Source: `specs/core.md` — organize desktop UI by feature, keeping platform adapters separate.
- Workspace domain types (`Entry`, `WorkspaceTree`, and the unused `NoteData`) live in `features/workspace/workspaceTypes.ts`.
- Workspace UI, state, and types are grouped under `features/workspace/`; `App.tsx` imports `useWorkspace` and `WorkspaceSidebar` from `../features/workspace`.
- Filesystem access stays behind the adapter seam: `shared/workspaceApi.ts` is the only Tauri `invoke` surface for workspace I/O and imports its `WorkspaceTree` type from the workspace feature. `useWorkspace` still calls `shared/workspaceApi` rather than `invoke` directly.
- `shared/ui/HeaderBar` (shared UI) imports workspace feature types, so the feature is a type source for shared chrome. The physical relocation of `workspaceApi.ts` to a dedicated platform-adapters location remains deferred; the current `shared/` seam is accepted for this epic.

## Entry point

- `apps/desktop/index.html` references `/src/app/main.tsx`.
- `main.tsx` keeps both stylesheet imports (`shared/theme/styles.css`, `shared/theme/theme-dark.css`) and the `React.StrictMode` root render.
