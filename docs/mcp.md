# Marnote MCP setup

The local MCP server gives one AI client read-only access to one workspace. Build it from a source checkout, then add the client configuration for your AI app.

## Build the server

From the repository root:

```sh
pnpm install
pnpm --filter @marnote/mcp build
```

Replace `/absolute/path/to/marnote` below with the repository path and `/absolute/path/to/workspace` with the workspace path. Use an absolute path to `node` if the client cannot find it.

## Configure your client

**Claude Code**

```sh
claude mcp add --transport stdio --scope user marnote -- node /absolute/path/to/marnote/packages/mcp/dist/cli.js /absolute/path/to/workspace
```

**Codex CLI**

```sh
codex mcp add marnote -- node /absolute/path/to/marnote/packages/mcp/dist/cli.js /absolute/path/to/workspace
```

**Cursor** — add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "marnote": {
      "command": "node",
      "args": ["/absolute/path/to/marnote/packages/mcp/dist/cli.js", "/absolute/path/to/workspace"]
    }
  }
}
```

**OpenCode** — add under `mcp.servers` in `opencode.json`:

```json
{
  "mcp": {
    "servers": {
      "marnote": {
        "type": "local",
        "command": ["node", "/absolute/path/to/marnote/packages/mcp/dist/cli.js", "/absolute/path/to/workspace"]
      }
    }
  }
}
```

Restart or reconnect the client. The server provides `list_workspace`, `read_note`, and `search_notes`; hidden dot-prefixed entries and symlinks are omitted.
