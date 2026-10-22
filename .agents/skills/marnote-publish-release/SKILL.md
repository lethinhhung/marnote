---
name: marnote-publish-release
description: Prepare or publish a versioned Marnote desktop release using the repository's changelog and tag-triggered GitHub Actions workflow. Use for release planning or execution, not ordinary feature promotion.
---

# Publish a Marnote release

Follow [`specs/operations/release.md`](../../../specs/operations/release.md). For promoting integrated work from `develop` to `main`, use [`marnote-release-from-develop`](../marnote-release-from-develop/SKILL.md) first.

Strata state is local to each workspace. `.strata.toml`, `docs/temps/`, `memory/`, and `prompt/` are ignored by Git; preserve local copies, and never add, stage, or publish these paths as part of a release.

## Prepare a release

1. Inspect the working tree, branches, latest release tag, and changes since that tag. Confirm the release commit is on `main`. Do not tag a feature branch or release unmerged work.
2. Choose the next SemVer version from the changes: patch for compatible fixes, minor for compatible features, and major for breaking changes after 1.0. Before 1.0, use the next minor for breaking changes. Use a prerelease suffix such as `0.2.0-beta.1` for previews.
3. Set the same version in `apps/desktop/package.json`, `apps/desktop/src-tauri/tauri.conf.json`, and `apps/desktop/src-tauri/Cargo.toml`. Update `apps/desktop/src-tauri/Cargo.lock` to match.
4. Add a dated `## [X.Y.Z] - YYYY-MM-DD` section to `CHANGELOG.md` with concise, user-facing changes and any compatibility or upgrade notes. The section must contain release notes, not only its heading.
5. Review the version and changelog diff. Run `pnpm check` and `pnpm build`. Confirm `node scripts/check-release-version.mjs vX.Y.Z` succeeds; inspect `node scripts/release-notes.mjs vX.Y.Z` output.
6. Commit the release preparation on the release commit intended for `main`. If it is not yet on `main`, follow the repository's normal release PR flow and wait for it to land before tagging.

## Publish

Only publish when the user asks to publish or push the release tag. Confirm the intended version and that the release commit is on `main`, then create and push an annotated tag:

```sh
git tag -a vX.Y.Z -m "Marnote vX.Y.Z"
git push origin vX.Y.Z
```

The `Release` GitHub Actions workflow validates the annotated tag, all version fields, and the changelog section; runs checks and builds; then publishes the GitHub Release after every platform build succeeds. It creates prereleases for tags containing a hyphen. Monitor the workflow and report its result. Do not claim a release is available until the workflow succeeds.

For explanation-only requests, describe these steps without changing versions, committing, tagging, or pushing.
