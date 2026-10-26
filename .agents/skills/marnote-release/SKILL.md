---
name: marnote-release
description: Prepare, promote, publish, or repair a Marnote desktop release. Use for release planning or execution, not ordinary feature promotion.
---

# Release Marnote

Follow [`specs/operations/release.md`](../../../specs/operations/release.md). Feature work integrates on `develop`; stable releases land on `main` through the normal branch merge and pull request flow.

Strata state is local to each workspace. `.strata.toml`, `docs/temps/`, `memory/`, and `prompt/` are ignored by Git. Preserve local copies and never add, stage, copy, or publish these paths. If a legacy commit contains tracked Strata state, exclude it from release changes and report any paths that cannot be separated safely.

## Prepare and promote

1. Inspect the working tree and branch state. Preserve local changes; do not switch branches with uncommitted work. Confirm the intended product changes have landed on `develop` and review the changes that will be promoted to `main`.
2. Choose the next SemVer version: patch for compatible fixes, minor for compatible features, and major for breaking changes after 1.0. Before 1.0, use the next minor for breaking changes. Use a prerelease suffix such as `0.2.0-beta.1` for previews.
3. Set the same version in `apps/desktop/package.json`, `apps/desktop/src-tauri/tauri.conf.json`, and `apps/desktop/src-tauri/Cargo.toml`; update `apps/desktop/src-tauri/Cargo.lock` to match.
4. Add a dated `## [X.Y.Z] - YYYY-MM-DD` section to `CHANGELOG.md` with concise, user-facing changes and compatibility or upgrade notes. The section must contain release notes, not only its heading.
5. Prepare the release changes on a branch based on `develop`, review the complete diff, and run `pnpm check`, `pnpm build`, `node scripts/check-release-version.mjs vX.Y.Z`, and inspect `node scripts/release-notes.mjs vX.Y.Z` output.
6. Land the release preparation on `develop` through the normal PR flow if needed. Promote the integrated `develop` changes to `main` through the repository's normal merge PR. Resolve conflicts by reviewing both sides; do not copy a guessed subset of product files or release unmerged work.
7. Confirm the release commit is on `main`, all required checks pass, the version fields match, and the changelog section is complete before tagging.

## Publish

Only publish when the user asks to publish or push the release tag. Confirm the intended version and that its release commit is on `main`, then create and push an annotated tag:

```sh
git tag -a vX.Y.Z -m "Marnote vX.Y.Z"
git push origin vX.Y.Z
```

The `Release` GitHub Actions workflow validates the annotated tag, version fields, and changelog section; runs checks and builds; then publishes the GitHub Release after every platform build succeeds. It marks tags containing a hyphen as prereleases. Monitor the workflow and report its result. Do not claim a release is available until the workflow succeeds.

## Repair a published macOS release

Only when requested, dispatch the `Release` workflow from `main` with the existing published tag. It rebuilds and replaces only the macOS assets; other platform assets stay in place. Confirm the workflow succeeds before reporting the repair complete.

For explanation-only requests, describe the relevant steps without changing versions, committing, opening or merging PRs, tagging, or pushing.
