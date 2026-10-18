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

## Next

- Remaining epic work: continue adding unit coverage for still-untested desktop and core modules; editor helpers SlashMenu, blockDnd, and tableResize are now covered.

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
