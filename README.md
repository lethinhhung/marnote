# Marnote

Marnote is a local-first Markdown workspace. Product and architecture constraints live in [`specs/`](./specs/).

## Development

Install dependencies with `pnpm install`, then run `pnpm dev` for the web shell or `pnpm --filter @marnote/desktop desktop:dev` for the Tauri desktop app.

Use `pnpm check` to run lint, typecheck, and tests. Individual commands are available as `pnpm lint`, `pnpm typecheck`, and `pnpm test`.

## Workspace

- `apps/desktop`: React, TypeScript, Vite, and Tauri v2 desktop client.
- `packages/core`: platform-independent TypeScript domain code.
