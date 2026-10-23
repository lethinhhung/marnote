# Daily Repository Maintenance

## Goal

Automate daily repository maintenance with GitHub Actions and OpenCode using NVIDIA NIM free API endpoints.

## Models

- Use OpenCode's built-in NVIDIA provider with `NVIDIA_API_KEY` stored as a GitHub Actions secret. NVIDIA's hosted free endpoints are for prototyping and are rate limited.
- Try these models in order, resetting the checkout between attempts:
  1. `nvidia/nvidia/nemotron-3.5-lightning-30b-a3b` — high-throughput model for agentic workloads.
  2. `nvidia/nvidia/nemotron-3-ultra-550b-a55b` — strong reasoning model for long-running agentic workflows.
  3. `nvidia/nvidia/nemotron-3.5-super-vl-120b-a12b` — newer agentic model with coding and tool-calling support.
- Move to the next model if OpenCode fails, including rate limits, or if it succeeds without producing changes. Do not create a PR if all models fail or produce no valid changes.
- Free endpoints are rate limited and availability can change. Recheck model IDs and access periodically.
- Run OpenCode with JSON event output and sum reported input, output, reasoning, and cache token counts for each model attempt. Include per-model totals in the Actions job summary and total usage in successful pull request descriptions. These are OpenCode-reported token counts, not provider quota balances.

## Schedule and Sessions

- Run every day at 23:59 in `Asia/Ho_Chi_Minh` (16:59 UTC; GitHub Actions scheduled workflows use UTC).
- The workflow is stored on `main`; scheduled runs start there, then each maintenance job checks out `develop` and opens its pull request against `develop`.
- Manual runs may set the optional `maintenance_date` input (`YYYY-MM-DD`) to label maintenance branches and pull requests for a specific date. Scheduled runs use the current UTC date.
- Manual runs may select `both`, `fix`, or `refactor`. Scheduled runs execute both sessions.
- Bug-fix runs select a focus area: `editor`, `workspace`, or `search`. Manual runs may choose one; scheduled and `auto` runs rotate by UTC day of year.
- Run two independent sessions, each starting from `develop`:
  1. Refactor
  2. Bug fix
- Each session uses its own dedicated branch and pull request.

## Refactor Session

- Inspect the project and follow all existing project rules, including `AGENTS.md` and `specs/`.
- Refactor at most three files.
- Prioritize work in this order:
  1. Files over 120 lines.
  2. Other project-rule violations.
  3. High complexity or poor separation of concerns.
  4. Duplicated or poorly structured code.
- Address the most significant violations first.
- Preserve existing behavior.
- Avoid unrelated or cosmetic-only changes.

## Bug Fix Session

- Inspect only the selected focus area and its directly related tests; inspect no more than eight implementation/test files.
- The focus areas are `apps/desktop/src/features/editor/`; `apps/desktop/src/features/workspace/`, `apps/desktop/src/platform/workspace.ts`, and directly related Tauri workspace/files modules; and `apps/desktop/src/shared/ui/searchNotes.ts` with its tests and `HeaderBar.tsx` when needed.
- If there is no evidence-backed bug in the selected area, leave the repository unchanged.
- Determine the likely root cause before changing code.
- Implement the smallest safe fix.
- Add or update a regression test when appropriate.
- Do not fix speculative issues without reasonable evidence.
- Do not install dependencies or run tests; the workflow runs `pnpm check` after edits.

## Validation

- The workflow runs `pnpm check` after edits.
- Do not create a pull request if the session produces no valid changes or validation fails.

## Git and Pull Requests

For each successful session:

- Create a dedicated branch from `develop`.
- Commit and push the changes.
- Open a pull request against `develop`.
- Never auto-merge.

Branch formats:

- `agent/refactor-YYYY-MM-DD`
- `agent/fix-YYYY-MM-DD`

## Pull Request Description

Use this concise format and include relevant validation results:

```md
## Problem
...

## Cause
...

## Fix
...

## Results
...
```

The Problem, Cause, and Fix sections must describe the specific issue and code changes in the pull request. Do not use placeholders such as "See the changes". The workflow rejects a model attempt that does not provide this summary. Exclude generated build and platform schema files from maintenance pull requests.
