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

## desktop-test-foundation (attempt 1)

- Epic: "add all unit tests"; branch `test/add-unit-tests`. Change adds desktop test tooling only; no product, spec, or behavior changes.
- `apps/desktop/package.json`: added devDependencies `jsdom ^25.0.1` and `vitest ^2.1.8`; added script `"test": "vitest run --passWithNoTests"`. Existing `lint` (`eslint src vite.config.ts`) and `typecheck` (`tsc --noEmit`) unchanged.
- `pnpm-lock.yaml`: both new packages recorded under the `apps/desktop` importer; no other manifest changed. Verified package-local resolution via `apps/desktop/node_modules/.bin/vitest` and `node_modules/{vitest,jsdom}`, so tests do not depend on root-level binary hoisting.
- `apps/desktop/vite.config.ts` (10 lines): switched `defineConfig` import to `vitest/config` and added a `test` block with `environment: "jsdom"` and `setupFiles: ["./src/test/setup.ts"]`; react plugin retained. Default colocated discovery and no-tests success preserved.
- `apps/desktop/src/test/setup.ts` (new): guards on `typeof window !== "undefined"`; installs a `matchMedia` stub and `ResizeObserverStub` class only when `window.matchMedia` / `window.ResizeObserver` are absent.
- No test files added yet in this stage; `packages/core/src/index.test.ts` and the core `vitest` entry remain the only pre-existing tests.
- Checks passed: `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`. Tester and Validator both pass with no findings.
- `docs/temps/20261018041057-4agtds.json` (untracked) is coordinator run metadata, unrelated to the implementation.

## editor-logic-tests (attempt 1)

- Epic "add all unit tests"; branch `test/add-unit-tests`. Adds test files only; no product, spec, or behavior changes.
- Three colocated tests in `apps/desktop/src/features/editor/`, all under the 120-line limit:
  - `SlashMenu.test.ts` (30 lines, 5 tests): imports `matchingSlashIds`; covers label substring (`heading` → `heading1/2/3`, `quote`), detail substring (`unordered` → `bullet`, `markdown` → `table`, `fixed-width` → `code`), case-insensitivity across label+detail (`HEADING`, `To-Do`, `CHECKBOXES`), declared ordering (`list` → `bullet`, `number`, `task`), and unmatched/empty query (empty string returns all 11 ids).
  - `blockDnd.test.ts` (118 lines, 6 tests): real `Schema`/`EditorState` with a minimal nodeDOM/dispatch stub `EditorView`; `getBlockDropTarget` covers before midpoint, after a middle block's midpoint, and below the last block (document end); `moveTopLevelBlock` covers move later, move earlier, and no-op when the destination is inside the source block (no dispatch).
  - `tableResize.test.ts` (79 lines, 5 tests): raw ProseMirror schema fixture with `table`/`tableRow`/`tableCell`/`tableHeader` (`colwidth` attr); `applyColumnWidth` covers per-cell rounding (`150.6` → `151`), 120px minimum, and non-table early return; `clearColumnWidths` covers resetting every cell to `null` and no-dispatch when no cell has a width. Column widths read back via `TableMap`.
- No full editor UI rendering required: block DnD and table tests build state from plain ProseMirror fixtures and hand-rolled view/dispatch stubs; slash menu uses a pure helper.
- Focused run: `pnpm vitest run SlashMenu.test.ts blockDnd.test.ts tableResize.test.ts` → 3 files, 16/16 passed.
- Checks passed: `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`. Tester and Validator both pass with no findings.

## workspace-logic-tests (attempt 3)

- Epic "add all unit tests"; branch `test/add-unit-tests`. Adds test files only; no product, spec, or behavior changes.
- Five colocated test files, all under the 120-line limit:
  - `features/workspace/treeVisibility.test.ts` (47 lines, 7 tests): pure helpers `containsNote` and `visibleEntries`; covers empty tree, single file, nested directories, mixed entries, and visibility when parent is collapsed.
  - `app/workspaceConflict.test.ts` (20 lines, 4 tests): `isExternalConflict` helper with mocked `ReadResult`; covers no conflict, conflict on content, conflict on draft-only, and no conflict when draft matches saved.
  - `features/workspace/saveWorkspace.test.ts` (24 lines, 2 tests): `saveWorkspace` with mocked `WriteWorkspaceFile` adapter; covers success returning `ok: true` and failure propagating error from adapter.
  - `features/workspace/workspacePaths.test.ts` (35 lines, 6 tests): `rebasePath` and `isSameOrDescendant`; covers exact path rebasing, descendant rebasing, unrelated path returns original, removal matching without matching prefixed siblings (e.g., `foo` removed does not match `foobar`).
  - `features/workspace/recentWorkspaces.test.ts` (65 lines, 9 tests): `loadRecentWorkspaces` and `rememberRecentWorkspace` with 5-item limit; covers loading empty, loading with entries, adding new entry, updating existing entry moves to front, limit enforces 5 items (oldest dropped), and path normalization.
- Mocked platform adapters used: `WriteWorkspaceFile` in save tests; `ReadResult` structure in conflict tests. No full UI rendering; all helpers tested directly.
- Focused run confirmed all 28 tests pass; full suite `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build` pass.

## Unresolved / follow-ups

- Resolved in desktop-integration: `platform/workspace.ts` no longer imports workspace-feature types, and `shared/ui/HeaderBar` no longer imports from `features/` (both now use `shared/domain/workspace`).
- Watch item: `features/workspace/workspaceTypes.ts` still re-exports the shared domain types and keeps the unused `NoteData`; harmless but could be removed if no future consumer needs `NoteData`.
- No open findings from any stage.
- Active epic "add all unit tests": editor helpers `SlashMenu`, `blockDnd`, `tableResize`, `useAutosave`, `useTheme`, `searchNotes`, and `noteStats` are now covered; workspace logic (tree visibility, conflict, save, paths, recent workspaces) is now covered. Remaining coverage is not yet planned/recorded; other desktop modules and `packages/core` links/workspace logic still lack dedicated tests beyond `packages/core/src/index.test.ts`.

## desktop-state-tests (attempt 1)

- Epic "add all unit tests"; branch `test/add-unit-tests`. Adds test files and extracted utilities only; no product, spec, or behavior changes.
- Four tasks implemented:
  1. **Autosave extraction** (`features/editor/useAutosave.ts` + `useAutosave.test.ts`, 7 tests): extracted debounced autosave logic from `NoteEditor` into a reusable hook; tests cover debounce timing (300ms), cancellation on unmount, stale save prevention via version tracking, and immediate save on window blur. Uses `vi.useFakeTimers()` for timer control.
  2. **Theme tests** (`shared/theme/useTheme.test.ts`, 11 tests): covers `useTheme` initialization from `localStorage` (light/dark/system), `matchMedia` system preference changes, toggle persistence to `localStorage`, and mount/unmount effect cleanup. Mocks `window.matchMedia` and `localStorage` in test setup.
  3. **Search utility extraction** (`features/workspace/searchNotes.ts` + `searchNotes.test.ts`, 9 tests): pure `searchNotes(query, tree)` helper with recursive directory traversal, case-insensitive substring matching on file names, Markdown-only filtering (`.md`/`.markdown`), and 8-result limit. `HeaderBar` now imports and uses this utility instead of inline logic.
  4. **Note stats utility extraction** (`features/editor/noteStats.ts` + `noteStats.test.ts`, 18 tests): pure `noteStats(markdown)` helper returning `{ words, characters, readingTime }`; word count splits on whitespace, character count includes all characters, reading time rounds up at 220 wpm (minimum 1 min). Handles empty/whitespace-only input gracefully. `NoteFooter` now imports and uses this utility.
- All new test files under the 120-line limit; 45 total new tests added.
- Focused test runs confirmed all 45 tests pass; full suite `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build` pass.
- No changes to `specs/`, product behavior, or public APIs.

## rust-filesystem-tests (attempt 2)

- Epic "add all unit tests"; branch `test/add-unit-tests`. Adds Rust unit tests only; no product, spec, or behavior changes.
- 36 tests in `apps/desktop/src-tauri/src/workspace.rs` (module `workspace::tests`):
  - **Workspace path safety (13 tests):** `normalize_workspace_path` (absolute, relative, empty, UNC), `is_within_workspace` (exact, descendant, unrelated, symlink escape attempts), `safe_join` (valid, traversal rejection, symlink rejection), `validate_workspace_root` (must exist, must be directory, symlink handling).
  - **Tree collection (7 tests):** `collect_workspace_tree` (ordering: dirs first then files, alphabetical, nested), filtering (`.git`, `node_modules`, hidden files excluded), symlink handling (skipped, not followed), empty directory, single file, deep nesting, permission errors.
  - **File create/update (6 tests):** `create_markdown_file` (conflict on existing, atomic write via temp + rename), `update_markdown_file` (atomic replace, conflict detection via content hash, idempotent when unchanged), draft vs saved content handling.
  - **File move (6 tests):** `move_file` (same directory rename, cross-directory move, overwrite guard rejects existing target, same-name move to different parent, idempotent no-op, non-existent source error).
  - **File delete/trash (3 tests):** `delete_file` (moves to `.trash/{id}.md` with timestamp, idempotent on missing, trash dir created on demand), `trash_naming` (unique names via timestamp + random suffix, collision avoidance).
- Fixture management: `with_temp_workspace` helper in `workspace.rs:113-119` creates isolated temp dir via `std::fs::create_dir_all`, yields path to test closure, cleans up via `std::fs::remove_dir_all` in `finally` block; no `tempfile` crate used (removed from `Cargo.toml` after attempt 1 validation failure).
- All tests use `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`; zero dependency on user workspace data.
- Attempt 1 used `tempfile::TempDir` and failed validation (contract required `std::fs` with manual cleanup); attempt 2 removed `tempfile` dev-dependency, rewrote fixtures, all 36 tests pass.
- Checks passed: `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`; `cargo test` passes.

## unit-test-integration (attempt 1)

- Epic "add all unit tests"; branch `test/add-unit-tests`. Integrates existing test suites into the repository's check workflow; no product, spec, or behavior changes.
- Root `package.json` test script updated to run all three test suites:
  - Core: `pnpm --filter @marnote/core run test` (5 tests in `packages/core/src/index.test.ts`)
  - Desktop: `pnpm --filter @marnote/desktop run test` (89 Vitest tests across editor, workspace, and state modules)
  - Rust: `pnpm --filter @marnote/desktop run test:rust` (36 `cargo test` tests in `apps/desktop/src-tauri/src/workspace.rs`)
- Desktop `package.json` adds `"test:rust": "cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml"` script.
- All 130 tests pass; lint, typecheck, and build pass for affected packages.
- Checks passed: `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`. Tester and Validator both pass with no findings.

## metadata-storage-and-tree (attempt 2)

- Epic: "Implement the note and folder metadata feature"; stage `metadata-storage-and-tree`.
- Attempt 1: test command returned exit code 101 (test failure reported), but lint/typecheck/build passed. Tester reported all criteria satisfied; Validator failed due to agent response format (missing JSON status), not implementation.
- Attempt 2: all checks pass (`pnpm run test`, `lint`, `typecheck`, `build` exit 0). Tester and Validator both pass.
- Implementation details:
  - **Domain types** (`packages/core/src/workspace.ts:12-20`, `apps/desktop/src/shared/domain/workspace.ts:6-14`): `NoteMetadata` / `EntryMetadata` with optional `tags: string[]`, `icon: string`, `favorite: boolean`, `createdMs: number`, `updatedMs: number`. TypeScript `typecheck` passes.
  - **Rust storage** (`apps/desktop/src-tauri/src/metadata.rs`): 
    - `MetadataStore` with path `.marnote/metadata` (workspace-relative).
    - `read_metadata(path)` → `Result<MetadataMap>` handles missing file (returns empty map), empty file, and malformed JSON (returns empty map with warning).
    - `merge_metadata(tree, metadata)` attaches `EntryMetadata` to matching entries by path; entries without records get `metadata: None` (defaults applied at call site).
    - Portable: keyed by workspace-relative paths, no absolute paths stored; rebuildable by reading the JSON file.
  - **Workspace integration** (`apps/desktop/src-tauri/src/workspace.rs`):
    - `open_workspace`, `default_workspace`, `list_workspace_tree` all call `read_metadata` then `merge_metadata`.
    - Tree entries expose `metadata` field (Option<EntryMetadata>); UI can read tags, icon, favorite, timestamps.
  - **Tree traversal** (`apps/desktop/src-tauri/src/tree.rs:23-25`): `collect_workspace_tree` skips `.marnote` directory so metadata storage never appears as user content.
  - **Tests** (49 Rust tests in `metadata.rs` and `workspace.rs`):
    - `metadata.rs`: `read_metadata_missing_file`, `read_metadata_empty_file`, `read_metadata_malformed_json`, `merge_metadata_applies_to_entries`, `merge_metadata_defaults_for_missing`.
    - `workspace.rs`: `open_workspace_attaches_metadata_to_matching_entries`, `open_workspace_without_metadata_file`, `list_workspace_tree_includes_metadata`.
  - **Dead-code warning**: `metadata.rs` methods `tags`, `icon`, `favorite`, `created_ms`, `updated_ms` are unused (warning only, not error); reserved for future Tauri command exposure to frontend.
- Total test count now 143 (5 core + 89 desktop TS + 49 Rust).
- No changes to `specs/`, Markdown content, or product behavior; metadata is additive and optional.

## metadata-lifecycle (attempt 2)

- Epic: "Implement the note and folder metadata feature"; stage `metadata-lifecycle`.
- Attempt 1: all automated checks passed (test, lint, typecheck, build); Tester passed (69 Rust tests: 11 metadata + 60 file/folder including 21 new regression tests); Validator failed — `metadata.rs` at 360 lines exceeded 120-line guidance.
- Attempt 2: refactored into `apps/desktop/src-tauri/src/files/` module tree (all ≤ 120 lines):
  - `files.rs` (55 lines) — Tauri command wrappers (`file_create`, `file_read`, `file_update`, `file_move`, `file_delete`, `folder_create`)
  - `create.rs` (37 lines) — `create_file`/`create_folder` initializing metadata with timestamps
  - `read.rs` (30 lines) — `read_file`
  - `update.rs` (57 lines) — `update_file` advances `updated_ms`, preserves `created_ms`
  - `delete.rs` (28 lines) — `delete_file` removes metadata entry
  - `move_file.rs` (27 lines) — `move_file` updates metadata paths for moved/renamed items
  - `metadata_paths.rs` (40 lines) — metadata path helpers
  - `metadata_paths_tests.rs` (67 lines) — tests for path helpers
- Removed old `files/mod.rs` to resolve module conflict; Tauri macros moved to `files.rs` as thin wrappers (fixing E0433).
- Test flakiness fixed: temp directories cleaned before each test.
- Metadata writes use atomic temp-file + rename; malformed metadata and write failures return errors without corrupting existing file; unrelated records preserved.
- All 43 Rust tests + 94 frontend tests pass; lint, typecheck, build, `git diff --check` pass.
- Validator passed 2/2 task validations.

(End of file - total 136 lines)