# Progress

Epic: refactor desktop app to feature-based structure (per `specs/core.md`).
Branch: `feat/feature-based-strata-improved`.

## app-and-shared-ui — passed (attempt 1)

- Completion criteria: entry/composition separated from shared UI and theme; all imports and entry references resolve; desktop typecheck and build pass.
- Outcome: composition moved to `apps/desktop/src/app`; reusable chrome/theme/helpers moved to `apps/desktop/src/shared`; `src/ui/` removed; `index.html` entry updated.
- Checks passed: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`; independent `tsc --noEmit`, `tsc -b`, and `vite build`.
- Validation: pass, no findings. No spec or behavior changes.

## workspace-feature — passed (attempt 1)

- Completion criteria: workspace UI/state/types organized as a feature with filesystem calls behind an adapter; selection, tree navigation, and file operations retain behavior; desktop typecheck and build pass.
- Outcome: `FileTree`, `TreeEditor`, `WorkspaceSidebar`, `useWorkspace`, and `workspaceTypes` grouped under `apps/desktop/src/features/workspace`; `shared/workspaceApi.ts` remains the filesystem adapter and imports feature types.
- Checks passed: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` (re-verified `typecheck` and `lint` clean).
- Validation: pass, 5/5 task validations. Import-path/relocation only; no spec or behavior changes.

## editor-feature — passed (attempt 1)

- Completion criteria: editor components and supporting Markdown, drag-and-drop, table, and preference logic organized together as a feature; editor interactions and Markdown serialization retain behavior; desktop typecheck and build pass.
- Outcome: 10 modules (`NoteEditor`, `EditorToolbar`, `NoteFooter`, `SlashMenu`, `BlockDragHandle`, `TableEdgeControls`, `blockDnd`, `initialMarkdown`, `tableResize`, `useWideContent`) grouped under `apps/desktop/src/features/editor`; pure renames with import-only content diffs.
- Checks passed: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`; independent `npm --prefix apps/desktop run typecheck`.
- Validation: pass, 3/3 task validations. No spec or behavior changes.

## platform-adapters — passed (attempt 1)

- Completion criteria: Tauri frontend imports isolated behind platform adapters; workspace filesystem, dialog, and window operations work through adapter interfaces; desktop typecheck and build pass.
- Outcome: added `apps/desktop/src/platform/{workspace,dialog,window}.ts`; deleted `shared/workspaceApi.ts`; rewired `App.tsx`, `useWorkspace.ts`, `WorkspaceSidebar.tsx`, and `HeaderBar.tsx` to the adapters. All `@tauri-apps` imports now confined to `platform/`.
- Checks passed: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- Validation: pass, 6/6 task validations. No spec or behavior changes.

## desktop-integration — passed (attempt 1)

- Completion criteria: desktop source separates app composition, features, shared UI, and platform adapters per `specs/core.md`; all imports/entry references resolve and desktop lint, typecheck, build pass; behavior and specs preserved.
- Outcome: canonical `Entry`/`WorkspaceTree` moved to `apps/desktop/src/shared/domain/workspace.ts`; `features/workspace/workspaceTypes.ts` re-exports them (plus `NoteData`); `platform/workspace.ts` and `shared/ui/HeaderBar.tsx` import from `shared/domain`. No `features/` imports remain under `platform/` or `shared/`.
- Checks passed: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- Validation: pass, 3/3 task validations. Type-relocation/import-path only; no spec or behavior changes.

## Next

- Remaining epic work: none outstanding for the active stages; feature organization (app, features, shared, platform) is complete and boundaries are clean.
- Follow-up candidate: remove `features/workspace/workspaceTypes.ts` re-export shim and unused `NoteData` if no future consumer needs them.
