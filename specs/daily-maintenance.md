# Daily Repository Maintenance

## Goal

Automate daily repository maintenance with GitHub Actions and OpenCode free models.

## Schedule and Sessions

- Run every day at 23:59 in `Asia/Ho_Chi_Minh` (16:59 UTC; GitHub Actions scheduled workflows use UTC).
- Run two independent sessions, each starting from the repository's default branch:
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

- Inspect the repository and identify one concrete bug.
- Determine the likely root cause before changing code.
- Implement the smallest safe fix.
- Add or update a regression test when appropriate.
- Do not fix speculative issues without reasonable evidence.

## Validation

- Follow the project's existing validation commands.
- Run relevant tests, lint, and type checks when available.
- Do not create a pull request if the session produces no valid changes or validation fails.

## Git and Pull Requests

For each successful session:

- Create a dedicated branch from the default branch.
- Commit and push the changes.
- Open a pull request against the default branch.
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
