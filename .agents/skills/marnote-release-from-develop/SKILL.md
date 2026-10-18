---
name: marnote-release-from-develop
description: "Prepare a Marnote release from develop for main while keeping Strata run records and memory on develop. Use when asked to promote or release integrated develop work."
---

# Release Marnote changes from develop

Use this workflow only when the user asks to prepare a Marnote release from `develop` to `main`. Feature PRs target `develop`; `main` is the release branch. Strata run records and memory stay on `develop`.

## Prepare a code-only release

1. Fetch `origin` and inspect the working tree and branches. Do not switch branches with local changes present. Confirm the requested work has landed on `origin/develop`; do not release unmerged feature branches.
2. Compare `origin/main...origin/develop` and review changed paths. Start a fresh `release/<short-description>` branch from `origin/main`.
3. Copy only the reviewed application, tests, and product configuration needed for the release from `origin/develop` onto the release branch. Use `git restore --source=origin/develop --staged --worktree -- <approved paths>` so the branch stays based on `main`.
4. Never copy Strata-generated state into the release: `.strata.toml`, `docs/temps/` run records, `memory/` Archivist notes, or `prompt/epic.md`. Do not merge `develop` directly into `main` or use `develop` as the release PR head; Strata commits mix generated state with product changes.
5. Review the staged diff and confirm none of those generated paths are present. Run the relevant checks for the included product changes. If required product changes cannot be separated confidently from generated state, stop and report the paths instead of guessing.
6. Commit and push the release branch. Open a PR from that branch to `main` when the user requested a PR. Summarize that Strata state remains on `develop` and recommend squash merge. Never merge the PR without the user's explicit request.

Keep the original `develop` branch intact so its run history and memory remain available to later Strata runs. Do not force-push or delete branches as part of this workflow.
