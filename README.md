<div align="center">
  <img src="apps/desktop/public/brand/mark.svg" alt="Marnote mark" width="88" />
  <h1>Marnote</h1>
  <p><strong>Your notes, in Markdown, on your device.</strong></p>
  <p>A calm, local-first workspace for everyday notes and project docs.</p>
  <p>
    <a href="https://github.com/lethinhhung/marnote/releases">Releases</a>
    · <a href="CHANGELOG.md">Changelog</a>
  </p>
</div>

Marnote keeps notes as regular Markdown files in folders you control. Work offline, open an existing folder as a workspace, and keep using your files with any editor.

## Why Marnote

- **Your files stay yours.** Notes are Markdown files on your filesystem, not locked in a proprietary database.
- **Works offline.** Create, organize, edit, and search notes locally.
- **One workspace for notes and projects.** Use the built-in notes space or open a folder, including a software repository.
- **Write comfortably.** Use a clean block editor with headings, lists, tasks, quotes, code, tables, and links.
- **Keep context organized.** Group notes in nested folders, add tags and favorites, and search across titles, paths, and content.
- **Fits your workflow.** Markdown remains portable, and Git can track changes in project workspaces.

## Get Marnote

The release workflow builds installers for macOS, Windows, and Linux. Check [GitHub Releases](https://github.com/lethinhhung/marnote/releases) for available downloads, and see the [changelog](CHANGELOG.md) for version history.

The macOS app is ad-hoc signed and not notarized. On first launch, macOS may require approval in **System Settings → Privacy & Security → Open Anyway**.

Project guidance lives in [`AGENTS.md`](./AGENTS.md) and [`specs/`](./specs/):

- [`product/`](./specs/product/): product behavior and requirements.
- [`ux/`](./specs/ux/): user interface interactions and workflows.
- [`engineering/architecture.md`](./specs/engineering/architecture.md): architecture and technology constraints.
- [`design/brand.md`](./specs/design/brand.md): visual identity.
- [`operations/`](./specs/operations/): release and maintenance procedures.

## Development

### Requirements

- Node.js 22 or later
- pnpm 9.15.0
- Rust toolchain for the native desktop app (install through [rustup](https://rustup.rs/))

```sh
git clone https://github.com/lethinhhung/marnote.git
cd marnote
pnpm install
pnpm --filter @marnote/desktop desktop:dev
```

To run the web shell during UI development, use `pnpm dev`. To check the project, use `pnpm check`; to build, use `pnpm build`.

### MCP server

Marnote's MCP server runs locally over stdio and uses one workspace path per server entry. Build it once from the repository root after installing dependencies:

```sh
pnpm install
pnpm --filter @marnote/mcp build
```

Replace `/absolute/path/to/marnote` with this repository's path and `/absolute/path/to/workspace` with the workspace directory. Use an absolute Node executable path if your MCP client does not inherit your shell's `PATH`.

**Claude Code**

```sh
claude mcp add --transport stdio --scope user marnote -- node /absolute/path/to/marnote/packages/mcp/dist/cli.js /absolute/path/to/workspace
```

**Codex CLI**

```sh
codex mcp add marnote -- node /absolute/path/to/marnote/packages/mcp/dist/cli.js /absolute/path/to/workspace
```

**Cursor** — add this to `.cursor/mcp.json` in the project where you use the server:

```json
{
  "mcpServers": {
    "marnote": {
      "command": "node",
      "args": [
        "/absolute/path/to/marnote/packages/mcp/dist/cli.js",
        "/absolute/path/to/workspace"
      ]
    }
  }
}
```

**OpenCode** — add this under `mcp.servers` in `opencode.json`:

```json
{
  "mcp": {
    "servers": {
      "marnote": {
        "type": "local",
        "command": [
          "node",
          "/absolute/path/to/marnote/packages/mcp/dist/cli.js",
          "/absolute/path/to/workspace"
        ]
      }
    }
  }
}
```

The read-only tools are `list_workspace` (browse visible Markdown files and folders, 200 entries per page by default), `read_note` (read up to 64 KiB), and `search_notes` (search titles, paths, tags, and content; 20 results by default, 100 maximum). Hidden dot-prefixed entries and symlinks are omitted. Restart or reconnect the client after changing its configuration.

## Project layout

- `apps/desktop` — React, TypeScript, Vite, and Tauri desktop app
- `packages/core` — platform-independent domain code
- `specs/` — product, architecture, and release specifications

## Contributing

Issues and pull requests are welcome. Please read [`AGENTS.md`](AGENTS.md) and the relevant files in [`specs/`](specs/) before making changes. Run `pnpm check` before submitting a pull request.

## License

No license file is currently included. Until one is added, the source is not explicitly licensed for reuse.
