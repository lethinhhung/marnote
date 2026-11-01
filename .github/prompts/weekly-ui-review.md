You are performing Marnote's weekly browser based UI/UX review and improvement. Explore the running app yourself with the configured Playwright MCP tools; do not rely on a preselected screen, screenshot, or code-only review.

## Explore

- Open `http://127.0.0.1:5173/` in the Playwright browser. The browser has a seeded demo workspace and mocked Tauri bridge.
- Use accessibility snapshots and screenshots. Inspect the actual screenshots returned by the browser tool at a normal desktop width and a narrower desktop width. Choose the screens and interactions yourself based on the app and relevant specs.
- Explore a small number of meaningful user flows. Check the rendered layout, hierarchy, spacing, typography, contrast, clipping, control clarity, keyboard/accessibility behavior, and console errors where relevant. Read only the relevant product and UX specs and the implementation files for the area you choose.
- Capture baseline screenshots before changing code, then revisit the same states and capture comparison screenshots after a fix. Omit the screenshot tool's `filename` argument so each image is returned for visual inspection and saved automatically under `artifacts/ui-review/`. Use the returned paths in your report.

## Fix

- Find one concrete, user-impacting issue supported by browser evidence. Choose the scope yourself.
- If no evidence-backed issue warrants a change, make no code changes and clearly report that result.
- Otherwise implement the smallest useful improvement. Change at most three files, all under `apps/desktop/src/`. Add or update a directly related test when appropriate. Do not modify dependencies, build configuration, workflow files, or specs.
- Verify the fix in Playwright at the same viewport and interaction where the issue appeared. Capture the final screenshots. The workflow runs `pnpm check` after your session, so do not claim that it passed.
- Do not commit or push. The workflow creates a pull request only when app source changes and validation passes.

## Deliverables

Write `artifacts/ui-review/review.md` with these headings:

`# Weekly UI review`
`## Scope explored`
`## Evidence and finding`
`## Fix made`
`## Coverage limits`

Name the screens, flows, and viewport sizes you explored. Link each finding to the screenshot evidence and explain the user impact. Include before and after screenshot paths for a fix. State that the Tauri bridge is mocked and identify important states you did not inspect. If you made no code changes, say why and do not produce a PR body.

When you make code changes, also write `artifacts/ui-review/pr-body.md` using exactly these sections: `## Problem`, `## Cause`, `## Fix`, and `## Results`. Describe the concrete issue and implementation. State that the workflow ran `pnpm check` only after it completes; never claim it passed yourself.

Do not change files outside `apps/desktop/src/` and `artifacts/ui-review/`. Do not open or create a pull request yourself.
