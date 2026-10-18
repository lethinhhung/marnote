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
- Workspace domain types `Entry` and `WorkspaceTree` are canonical in `shared/domain/workspace.ts` (see "Shared domain types"); `features/workspace/workspaceTypes.ts` now re-exports them and keeps the unused `NoteData`.
- Workspace UI, state, and types are grouped under `features/workspace/`; `App.tsx` imports `useWorkspace` and `WorkspaceSidebar` from `../features/workspace`.
- Filesystem access stays behind the adapter seam: `platform/workspace.ts` is the only Tauri `invoke` surface for workspace I/O and imports its `WorkspaceTree` type from `shared/domain/workspace`. `useWorkspace` calls `platform/workspace` rather than `invoke` directly.
- `shared/ui/HeaderBar` (shared UI) imports `Entry`/`WorkspaceTree` from `shared/domain/workspace`, so shared chrome no longer depends on the workspace feature.

## Platform adapters

- Source: `specs/core.md` — keep platform adapters separate and domain logic platform-independent.
- `apps/desktop/src/platform/` is the single location permitted to import `@tauri-apps/*`. Modules:
  - `workspace.ts` — workspace filesystem I/O: `openWorkspace`, `openDefaultWorkspace`, `listWorkspace`, `readFile`, `writeFile`, `createFile`, `moveFile`, `deleteFile`, `createFolder`, plus `ReadResult`.
  - `dialog.ts` — desktop detection and folder picker: `isDesktop`, `openWorkspaceFolder`, `WorkspaceFolderPickerOptions`.
  - `window.ts` — window controls: `windowDragAvailable`, `startWindowDrag`.
- Feature/shared/app callers import these adapters: `app/App.tsx` and `features/workspace/useWorkspace.ts` use `platform/workspace`; `features/workspace/WorkspaceSidebar.tsx` uses `platform/dialog`; `shared/ui/HeaderBar.tsx` uses `platform/window`.
- The adapter depends on `shared/domain/workspace` for the `WorkspaceTree` type; platform behavior is otherwise unchanged.

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

## Desktop unit testing

- Source: epic "add all unit tests" — make desktop TypeScript tests a supported, package-local workflow with the environment needed for browser-dependent modules.
- `apps/desktop` owns its test tooling: `vitest ^2.1.8` and `jsdom ^25.0.1` are declared as package-local `devDependencies`, with test script `vitest run --passWithNoTests`.
- Tests must not rely on root-level binary hoisting; `pnpm-lock.yaml` records the desktop devDependencies under the `apps/desktop` importer, and `apps/desktop/node_modules/.bin/vitest` plus `node_modules/{vitest,jsdom}` resolve package-locally.
- `packages/core` keeps its own independent `vitest ^2.1.8` devDependency and `test` script; the two packages are not consolidated.
- `apps/desktop/vite.config.ts` imports `defineConfig` from `vitest/config` (not `vite`) and configures `test.environment: "jsdom"` with `test.setupFiles: ["./src/test/setup.ts"]`; default colocated test discovery is retained, so `--passWithNoTests` keeps the command usable with no matches.
- `apps/desktop/src/test/setup.ts` is the shared setup file; it stubs `window.matchMedia` and `window.ResizeObserver` only when the DOM environment lacks them, leaving jsdom's native implementations untouched when present.
- Test files are colocated with the module under test (e.g. `features/editor/SlashMenu.test.ts`) and default Vitest discovery is used; no separate test directory or custom glob.
- Editor-logic tests avoid rendering the full editor: ProseMirror helpers are exercised with raw `Schema`/`EditorState` fixtures plus minimal hand-rolled `EditorView`/dispatch stubs, and pure helpers are tested directly. This keeps tests deterministic and free of heavy UI setup.
- Raw ProseMirror schemas are declared locally in the test fixture (not imported from the app) so table/DnD tests control exactly the nodes and attributes they assert on; `TableMap` is used to read back cell widths.
- Per `AGENTS.md`, every code file — including test files — must stay under 120 lines; editor test files are split by module (`SlashMenu.test.ts`, `blockDnd.test.ts`, `tableResize.test.ts`) to respect this.

## Shared domain types

- Source: `specs/core.md` — organize desktop UI by feature, keeping app composition, shared UI, and platform adapters separate; keep domain logic platform-independent.
- Canonical workspace domain types `Entry` and `WorkspaceTree` moved to `apps/desktop/src/shared/domain/workspace.ts` (declarations unchanged: `Entry = { name; path; kind: "directory" | "file"; children? }`, `WorkspaceTree = { name; path; entries }`).
- `features/workspace/workspaceTypes.ts` now re-exports `Entry`/`WorkspaceTree` from `shared/domain/workspace` and retains the local (still unused) `NoteData`.
- `platform/workspace.ts:2` and `shared/ui/HeaderBar.tsx:4` import the types from `shared/domain/workspace`, removing the previous `platform → features` and `shared → features` type dependencies.
- The dependency direction is now: features/platform/shared → `shared/domain`; no `features/` imports remain in `platform/` or `shared/`.

## Rust filesystem tests: std::fs fixtures over tempfile crate

- Source: stage `rust-filesystem-tests` completion criteria and validation.
- Rust unit tests for filesystem behavior (workspace path safety, tree collection, file updates, moves, deletion) use isolated temporary directories created with `std::fs` and cleaned up manually via a `with_temp_workspace` helper, not the `tempfile` crate.
- Rationale: the task contract explicitly required avoiding test dependencies and using `std::fs` with manual cleanup; initial attempt used `tempfile::tempdir()` and failed validation; second attempt removed the `tempfile` dev-dependency from `Cargo.toml` and rewrote fixtures to use `std::fs::create_dir_all`, `std::fs::remove_dir_all`, and a RAII-style guard for cleanup.
- Outcome: all 36 Rust tests pass (13 workspace path tests, 7 tree collection tests, 6 file create/update tests, 6 file move tests, 3 file delete tests) with zero external test dependencies; full check suite (`cargo test`, lint, typecheck, build) passes.

(End of file - total 66 lines)