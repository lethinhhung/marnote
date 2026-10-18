# Progress

Epic: add all unit tests.
Branch: `test/add-unit-tests`.

## desktop-test-foundation — passed (attempt 1)

- Completion criteria: desktop declares its test runner dependency and runs tests without relying on root-level binary hoisting; Vitest config supports the browser APIs needed by planned desktop tests; the test command discovers colocated tests and remains usable with no matching tests.
- Outcome: `apps/desktop/package.json` adds package-local `vitest ^2.1.8` and `jsdom ^25.0.1` devDependencies plus `"test": "vitest run --passWithNoTests"`; `apps/desktop/vite.config.ts` uses `vitest/config` with `environment: "jsdom"` and `setupFiles: ["./src/test/setup.ts"]`; new `apps/desktop/src/test/setup.ts` stubs `matchMedia` and `ResizeObserver` only when missing.
- Evidence: `pnpm-lock.yaml` records both packages under `apps/desktop`; `apps/desktop/node_modules/.bin/vitest` and `node_modules/{vitest,jsdom}` resolve package-locally; `packages/core` retains its own `vitest` entry.
- Checks passed: `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`.
- Validation: pass, 2/2 task validations. No spec or behavior changes.

## editor-logic-tests — passed (attempt 1)

- Completion criteria: tests cover slash-choice matching, block drop target and move behavior, and table width calculations plus cleanup; tests use focused fixtures/mocks without full editor UI rendering; added test files stay within the 120-line code-file limit.
- Outcome: three colocated test files added under `apps/desktop/src/features/editor/` — `SlashMenu.test.ts` (30 lines), `blockDnd.test.ts` (118 lines), `tableResize.test.ts` (79 lines), 16 tests total.
- Evidence: `pnpm vitest run SlashMenu.test.ts blockDnd.test.ts tableResize.test.ts` → 3 files, 16/16 passed.
- Checks passed: `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`.
- Validation: pass, 3/3 task validations. No spec or product changes.

## workspace-logic-tests — passed (attempt 3)

- Completion criteria: tests cover note visibility and relevant path construction or rebasing behavior; tests cover recent-workspace persistence and its item limit; tests cover save and conflict outcomes using mocked platform adapters; all added test files comply with the repository's code-file size limit (120 lines).
- Outcome: five colocated test files added under `apps/desktop/src/`:
  - `features/workspace/treeVisibility.test.ts` (47 lines, 7 tests) — covers `containsNote` and `visibleEntries`.
  - `app/workspaceConflict.test.ts` (20 lines, 4 tests) — covers `isExternalConflict`.
  - `features/workspace/saveWorkspace.test.ts` (24 lines, 2 tests) — covers success/failure with mocked `WriteWorkspaceFile` adapter.
  - `features/workspace/workspacePaths.test.ts` (35 lines, 6 tests) — covers `rebasePath` and `isSameOrDescendant` (exact/descendant rebasing, unrelated paths, removal matching without matching prefixed siblings).
  - `features/workspace/recentWorkspaces.test.ts` (65 lines, 9 tests) — covers `loadRecentWorkspaces` and `rememberRecentWorkspace` with 5-item limit.
- Evidence: `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build` all pass; focused test output confirms all 28 tests pass.
- Validation: pass, 1/1 task validations. No spec or behavior changes.

## desktop-state-tests — passed (attempt 1)

- Completion criteria: tests cover autosave sequencing and debounce behavior, theme initialization and toggle behavior, search filtering and result limits, and word, character, and reading-time calculations; browser globals and timers controlled by focused test fixtures or mocks; all added test files comply with the 120-line code-file limit.
- Outcome: four task implementations under `apps/desktop/src/`:
  - Task 1: extracted autosave logic into `features/editor/useAutosave.ts` with 7 tests in `useAutosave.test.ts` (covers debounce timing, cancellation, stale save handling).
  - Task 2: 11 tests added for `shared/theme/useTheme.ts` covering initialization from localStorage/system preference, toggle persistence, and mount effects with controlled `matchMedia` and `localStorage` mocks.
  - Task 3: extracted `features/workspace/searchNotes.ts` utility with 9 tests in `searchNotes.test.ts` (recursive directory traversal, case-insensitive matching, Markdown filtering, 8-result limit); `HeaderBar` now uses the utility.
  - Task 4: extracted `features/editor/noteStats.ts` utility with 18 tests in `noteStats.test.ts` (word/character counting, reading-time rounding at 220 wpm, empty-input handling); `NoteFooter` uses the utility.
- Evidence: `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build` all pass; 45 new tests added.
- Validation: pass, 4/4 task validations. No spec or behavior changes.

## rust-filesystem-tests — passed (attempt 2)

- Completion criteria: tests cover workspace path validation, traversal and symlink protections, and tree filtering and ordering; tests cover file conflict detection, atomic update behavior, move guards, and deletion or trash naming behavior; Rust tests run with `cargo test` from the Tauri crate without relying on user workspace data.
- Outcome: 36 Rust unit tests added under `apps/desktop/src-tauri/src/`:
  - `workspace.rs` (13 tests): workspace path validation (absolute paths, no traversal, symlink rejection, root containment), tree collection (ordering, filtering, symlinks), file create/update (conflict detection, atomic writes), file move (cross-directory, overwrite guard, same-name), file delete (trash naming, non-existent idempotent).
  - Fixtures use `std::fs` with `with_temp_workspace` helper for isolated temp directories; no `tempfile` crate dependency.
- Evidence: `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` → 36 tests pass; full check suite (`pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`) passes.
- Validation: pass, 1/1 task validations. Attempt 1 failed validation for using `tempfile` crate; attempt 2 removed dev-dependency and rewrote fixtures to use `std::fs` with manual cleanup.

## Next

- Remaining epic work: continue adding unit coverage for still-untested desktop and core modules; editor helpers SlashMenu, blockDnd, tableResize, autosave, theme, searchNotes, and noteStats are now covered; workspace logic (tree visibility, conflict, save, paths, recent workspaces) is now covered; Rust filesystem behavior (workspace paths, tree, file CRUD, moves, deletion) is now covered.

# Prior epic: refactor desktop app to feature-based structure

(Complete; retained for reference.)

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

(End of file - total 86 lines)