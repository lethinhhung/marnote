# Marnote

Marnote is a local-first Markdown workspace. Project guidance lives in [`AGENTS.md`](./AGENTS.md) and [`specs/`](./specs/):

- [`core.md`](./specs/core.md): product behavior and requirements.
- [`tech.md`](./specs/tech.md): architecture and technology constraints.
- [`brand.md`](./specs/brand.md): visual identity.
- [`daily-maintenance.md`](./specs/daily-maintenance.md): automated maintenance sessions and pull request rules.

## Development

Install dependencies with `pnpm install`, then run `pnpm dev` for the web shell or `pnpm --filter @marnote/desktop desktop:dev` for the Tauri desktop app.

Use `pnpm check` to run lint, typecheck, and tests. Individual commands are available as `pnpm lint`, `pnpm typecheck`, and `pnpm test`.

## Workspace

- `apps/desktop`: React, TypeScript, Vite, and Tauri v2 desktop client.
- `packages/core`: platform-independent TypeScript domain code.
