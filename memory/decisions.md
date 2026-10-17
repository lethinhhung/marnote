# Decisions

## D-001 Feature-based desktop layout (stage `workspace-adapters`)

The desktop app organizes code by responsibility instead of a flat `src/ui/` directory,
following `specs/core.md` (Architecture: "UI should not directly own filesystem logic";
"Platform-specific functionality should stay behind adapters").

Established boundaries:

- `apps/desktop/src/features/workspace/` — workspace feature state and shared types.
  - `types.ts` holds `Entry`, `WorkspaceTree`, `NoteData`.
  - `useWorkspace.ts` owns workspace state and operations.
- `apps/desktop/src/platform/` — platform adapters.
  - `workspaceApi.ts` is the only module importing Tauri `invoke`; it wraps all
    workspace/filesystem commands.
  - `desktopUi.ts` wraps desktop-only UI capabilities: `isDesktopApp` (`isTauri`),
    `pickWorkspaceDirectory` (dialog plugin), and `startWindowDragging` (window API).

## D-002 Tauri access confined to the platform adapter

All Tauri command access stays behind `platform/workspaceApi.ts`. UI components import
from the adapter rather than `@tauri-apps/api` or `@tauri-apps/plugin-dialog` directly.
`HeaderBar` and `WorkspaceSidebar` now consume `desktopUi` helpers instead of inline
Tauri calls. This preserves the adapter boundary for future non-desktop clients.

## D-003 Move-only refactor, no behavior change

The change is import-path-only plus extraction of inline Tauri calls into `desktopUi`
helpers with identical runtime behavior. Command names, argument mappings, pointer
conditions, and error handling are unchanged. `types.ts` is byte-identical to the
former `workspaceTypes.ts`.
