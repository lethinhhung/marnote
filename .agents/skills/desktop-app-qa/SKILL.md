---
name: desktop-app-qa
description: Exercise Marnote desktop or web workflows against product and UX specs, inspect runtime evidence, and fix confirmed issues when requested.
---

# Marnote app QA

Use this skill when a task asks to operate Marnote as a user, compare a workflow with its specs, diagnose a UI/runtime issue, or fix an issue found through app interaction.

## Choose the target

- Read the relevant `specs/product/` and `specs/ux/` files first. Treat them as expected behavior; note any ambiguity before calling something a defect.
- Inspect both `apps/desktop` and `apps/web` for shared workflows. Run only the platforms requested, plus the other platform when the behavior is shared and a fix could affect it.
- For native desktop behavior, use the Tauri WebDriver flow: `pnpm test:desktop:e2e`. It builds the debug app with test-only Tauri plugins, launches it with an isolated temporary home directory, and stores logs/screenshots under `artifacts/desktop-e2e/`.
- For web behavior, use Playwright against the web app. The existing broad acceptance flow is `pnpm --filter @marnote/web test:acceptance`; for a targeted investigation, add or run a focused flow with a fresh browser context so IndexedDB state is isolated.

## Investigate and fix

1. Turn the requested scenario into observable steps and expected results from the relevant specs. Keep each run focused on that scenario.
2. Interact through accessible roles, labels, and visible app behavior. Avoid relying on source-level shortcuts when the issue concerns what a user sees or does.
3. Capture the failing step, actual result, screenshot, and frontend/backend errors. Distinguish a product defect from an environment or automation setup failure.
4. If asked to fix the issue, trace the observed failure to its cause, implement the smallest spec-consistent change, then rerun the same app flow. Check the other platform for shared behavior and follow repository guidance.
5. Report the target platform, spec expectation, observed result, fix (if made), verification result, and any unresolved limitation. Do not claim a workflow passed if the app did not launch or the relevant assertion did not run.

The desktop E2E harness uses debug builds only. Keep WebDriver plugins and permissions scoped to `tauri.wdio.conf.json` and debug-only Rust dependencies; do not expose test execution in release builds.
