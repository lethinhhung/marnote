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

Advanced users can configure an MCP client to start Marnote's local stdio server. From the repository root, use this generic client configuration and replace the workspace path with the folder to open:

```json
{
  "mcpServers": {
    "marnote": {
      "command": "pnpm",
      "args": [
        "--filter",
        "@marnote/mcp",
        "start",
        "--",
        "/absolute/path/to/workspace"
      ]
    }
  }
}
```

The server provides three read-only tools: `list_workspace` lists Markdown notes and folders, `read_note` reads a note, and `search_notes` searches notes by their content and metadata.

## Project layout

- `apps/desktop` — React, TypeScript, Vite, and Tauri desktop app
- `packages/core` — platform-independent domain code
- `specs/` — product, architecture, and release specifications

## Contributing

Issues and pull requests are welcome. Please read [`AGENTS.md`](AGENTS.md) and the relevant files in [`specs/`](specs/) before making changes. Run `pnpm check` before submitting a pull request.

## License

No license file is currently included. Until one is added, the source is not explicitly licensed for reuse.
