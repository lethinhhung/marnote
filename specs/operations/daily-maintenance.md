# Daily Repository Maintenance

## Goal

Automate daily repository maintenance with GitHub Actions and OpenCode using NVIDIA NIM free API endpoints.

## Models

- Use OpenCode's built-in NVIDIA provider with `NVIDIA_API_KEY` stored as a GitHub Actions secret. NVIDIA's hosted free endpoints are for prototyping and are rate limited.
- Try these models in order, resetting the checkout between attempts:
  1. `nvidia/nvidia/nemotron-3.5-super-vl-120b-a12b` — newest NVIDIA endpoint focused on agentic coding and tool use.
  2. `nvidia/nvidia/nemotron-3-ultra-550b-a55b` — widely used reasoning model for coding, planning, and long-running agents.
  3. `nvidia/poolside/laguna-xs-2.1` — coding-agent model specialized for terminal tasks.
- Move to the next model if OpenCode fails, including rate limits, or if it succeeds without producing changes. Do not create a PR if all models fail or produce no valid changes.
- Free endpoints are rate limited and availability can change. Recheck model IDs and access periodically.
- Run OpenCode with JSON event output and sum reported input, output, reasoning, and cache token counts for each model attempt. Include per-model totals in the Actions job summary and total usage in successful pull request descriptions. These are OpenCode-reported token counts, not provider quota balances.

## Schedule and Sessions

- Run every day at 11:59 and 23:59 in `Asia/Ho_Chi_Minh` (04:59 and 16:59 UTC; GitHub Actions scheduled workflows use UTC).
- The workflow is stored on `main`; scheduled runs start there, then each maintenance job checks out `develop` and opens its pull request against `develop`.
- Manual runs may set the optional `maintenance_date` input (`YYYY-MM-DD`) to label maintenance branches and pull requests for a specific date. Scheduled runs use the current UTC date.
- Manual runs may select `all`, `fix`, `refactor`, or `tests`. The `all` option runs all three sessions. Scheduled runs execute refactor and bug-fix sessions at both times, and the test-gap session only at 23:59.
- Bug-fix runs select a focus area: `editor`, `workspace`, or `search`. Manual runs may choose one; scheduled and `auto` runs rotate by UTC day of year.
- A weekly UI review runs every Monday at 05:59 UTC (12:59 in `Asia/Ho_Chi_Minh`). The agent uses Playwright to choose a scope, explore the interface, capture evidence, and implement at most one focused UI improvement. It opens a pull request only when `pnpm check` passes and code changes were made.
- Run independent sessions, each starting from `develop`:
  1. Refactor
  2. Bug fix
  3. Test gap (23:59 run only)
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
- Dependencies are installed before OpenCode runs. Run focused lint, directly related unit tests, and the relevant package typecheck during implementation; fix failures and rerun affected checks. Do not run the full `pnpm check`; the workflow runs it as the final gate.

## Test Gap Session

- Identify one evidence-backed unit-test gap and add or update tests only.
- Inspect no more than six directly related implementation and test files, and change no more than two test files.
- Do not change production code, configuration, documentation, or generated files.
- If no clear gap can be tested without production changes, leave the repository unchanged.
- Dependencies are installed before OpenCode runs. Run directly related unit tests and lint changed test files during implementation; fix failures and rerun those checks. Do not run the full `pnpm check`; the workflow runs it as the final gate.

## Validation

- The workflow runs `pnpm check` after edits.
- Do not create a pull request if the session produces no valid changes or validation fails.

## Weekly UI Review

- Install Chromium and run the desktop React interface with a deterministic in-memory Tauri bridge and demo workspace. Give OpenCode Playwright MCP tools so the agent can navigate, interact, resize, inspect screenshots, and choose its own review scope.
- The agent explores a small number of user flows, uses relevant UX specs, and captures before and after screenshots when it makes a fix. Preserve the report and screenshots as a 30-day Actions artifact.
- Permit at most one evidence-backed UI fix per run, changing up to three files under `apps/desktop/src/`. If no supported fix is found, leave code unchanged and do not open a pull request.
- Run `pnpm check` after edits. Open a pull request against `develop` only when validation passes.
- The manual `workflow_dispatch` run uses the same review flow.

## Git and Pull Requests

For each successful session:

- Create a dedicated branch from `develop`.
- Commit and push the changes.
- Open a pull request against `develop`.
- Never auto-merge.

Branch formats:

- `agent/refactor-YYYY-MM-DD`
- `agent/fix-YYYY-MM-DD`
- `agent/tests-YYYY-MM-DD`

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
