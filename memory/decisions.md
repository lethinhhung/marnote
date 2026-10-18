# Decisions

## Desktop code organization (feature-based)

- Source: `specs/core.md` — organize desktop UI by feature, keeping app composition, shared UI, and platform adapters separate; keep domain logic platform-independent.
- Layout for `apps/desktop/src`:
  - `app/` — composition and entry: `main.tsx`, `App.tsx`, `useWorkspace.ts`.
  - `shared/ui/` — reusable chrome components.
  - `shared/theme/` — stylesheets and `useTheme.ts`.
  - `shared/` — cross-cutting helpers (`blockDnd.ts`, `tableResize.ts`, `initialMarkdown.ts`, `useWideContent.ts`, `workspaceApi.ts`, `workspaceTypes.ts`).
- The former `src/ui/` directory is retired; composition is no longer mixed with reusable UI.
- `workspaceApi.ts` remains under `shared/` for now; its move to platform adapters is deferred to a later stage.

## Entry point

- `apps/desktop/index.html` references `/src/app/main.tsx`.
- `main.tsx` keeps both stylesheet imports (`shared/theme/styles.css`, `shared/theme/theme-dark.css`) and the `React.StrictMode` root render.
