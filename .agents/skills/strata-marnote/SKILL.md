---
name: strata-marnote
description: Use Strata from the sibling ../strata checkout to implement a user-provided epic in this Marnote repository, monitor the run, and repair Strata on a new branch when real failures expose defects.
---

# Run Strata against Marnote

Use this skill when the user provides an epic and asks Strata to implement it in this repository. The Marnote checkout is the target (`../marnote` from the Strata checkout); run the Strata CLI from `../strata`.

## Start the run

1. Preserve the user's epic text exactly. Do not silently narrow its scope or invent acceptance criteria.
2. Inspect both checkouts before changing anything:
   - In Marnote, confirm the repository root, current branch, and worktree state. Strata requires a named branch and a clean target worktree, except for the selected epic file and `.strata.toml`.
   - In Strata, inspect the current branch and worktree. Preserve all existing staged, unstaged, and untracked changes. Never overwrite, discard, reset, or include unrelated changes in a fix commit.
3. From `../strata`, build the current checkout if its CLI output is missing or stale, then launch the epic in Marnote:

   ```sh
   node dist/src/cli.js run "USER EPIC TEXT" --repo ../marnote
   ```

   Pass the user's actual epic as one correctly quoted argument. For a long epic, write it to a temporary file and use `--epic FILE`; do not put it in a tracked Strata file. Run the process in the foreground so its output and exit status remain observable.
4. Monitor the process until it exits. Send concise progress updates while it is active. Treat Strata's progress output and the run record as evidence; do not infer a crash from a quiet interval alone. Strata's defaults include provider deadlines and inactivity timeouts.
5. Capture the run ID from the final output or the newest run record in `../marnote/docs/temps/`. A nonzero exit or interrupted process is not proof of a Strata defect: inspect the run record, error, blockers, and relevant logs first.

## Repair Strata and resume

When the process exits unsuccessfully or crashes:

1. Identify whether the failure is a Strata defect, a provider/environment issue, or a Marnote blocker. Only change Strata when observed evidence points to a Strata defect. If it is external or a Marnote blocker, explain the evidence and do not fabricate a Strata fix.
2. In `../strata`, preserve existing user changes and create a new branch from the current checkout before implementing the fix. Use a descriptive name such as `fix/marnote-run-<short-summary>`. If the branch name already exists, choose a unique suffix. Do not switch away from or rewrite another branch's history.
3. Reproduce the defect as narrowly as practical, implement the smallest correct fix, and follow `../strata/README.md` and its repository instructions for relevant quality checks. Stage and commit only files changed for this fix; leave pre-existing edits untouched. Do not push the Strata fix branch unless the user explicitly asks.
4. Rebuild Strata from `../strata`, then resume the original Marnote run using the same run ID:

   ```sh
   node dist/src/cli.js resume RUN_ID --repo ../marnote
   ```

   Resume preserves completed stages. Do not start a replacement run unless the original run record is missing or unusable; if that happens, explain why and use the original epic to start again only when safe.
5. Monitor the resumed process to completion. If a new Strata defect appears, repeat the repair on another new branch based on the current Strata branch, rebuild, and resume that same run. Keep each fix isolated and do not conceal repeated failures.

## Completion

Report the Marnote run ID and final status, the implementation branch/result in Marnote, and any Strata fix branch and commit. Mention blockers or provider failures that remain. Never claim completion unless the saved run status is `complete`.
