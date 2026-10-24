Inspect the selected focus area only. Follow `AGENTS.md` and the specs relevant to that area.

The workflow appends one focus area to this prompt: `editor`, `workspace`, or `search`. Use these boundaries:

- `editor`: `apps/desktop/src/features/editor/` and directly related editor tests.
- `workspace`: `apps/desktop/src/features/workspace/`, `apps/desktop/src/platform/workspace.ts`, and directly related Tauri workspace/files modules and tests.
- `search`: `apps/desktop/src/shared/ui/searchNotes.ts`, `searchNotes.test.ts`, and `HeaderBar.tsx` only when needed to verify how search results are used.

Treat the selected area as a strict boundary. Do not scan unrelated directories or inspect more than eight implementation/test files. Read only directly relevant specs. Identify one concrete bug with evidence and its likely root cause before editing. Implement the smallest safe fix and add or update a regression test when appropriate. Before finishing, review the final diff for stale variables or imports and obvious lint or type errors. Do not install dependencies or run tests; the workflow runs `pnpm check` after your edits. Do not claim checks passed unless they were actually run. Do not fix speculative issues or include generated build/schema artifacts. If you find no evidence-backed bug within the selected area, leave the repository unchanged. Do not commit or push.
