# Release Strategy

## Versioning

- Version the desktop app with Semantic Versioning (`MAJOR.MINOR.PATCH`). While the app is pre-1.0, use minor versions for breaking changes.
- Keep the app version synchronized in `apps/desktop/package.json`, `apps/desktop/src-tauri/tauri.conf.json`, and `apps/desktop/src-tauri/Cargo.toml`; update `Cargo.lock` with Rust package version changes.
- Keep `packages/core` private and independently versioned only if it becomes a separately published package.
- Use annotated Git tags named `vX.Y.Z` on release commits. Use prerelease identifiers such as `0.1.0-beta.1` for preview builds.

## Release Flow

- Integrate work on `develop`; release stable builds from `main`.
- Prepare a release by synchronizing versions and updating `CHANGELOG.md`, then merge the release commit to `main` and tag it.
- Build platform installers in GitHub Actions and attach them to a GitHub Release. Keep prereleases marked as such.
- Run the existing CI checks and desktop build successfully before publishing.

## Release Notes and README

- Maintain a `CHANGELOG.md` with `## [X.Y.Z] - YYYY-MM-DD` sections for each release, including notable changes, fixes, compatibility changes, and upgrade notes.
- Keep the README focused on the product and development setup; include a link to downloads, supported platforms, and the changelog when public releases begin.
