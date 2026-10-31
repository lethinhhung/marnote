# Integrations

## Requirements

- Core note taking works offline without an account.
- Git is optional; actions require explicit intent and preserve clean Markdown diffs.
- MCP should let AI tools browse, read, and search workspace files. Future writes must be explicit and auditable.

## MCP first milestone

- Run locally over stdio for one workspace supplied by the MCP client; no network service or account.
- Expose read-only `list_workspace`, `read_note`, and `search_notes` tools. List visible Markdown files and folders; search titles, paths, tags, and content, returning ranked excerpts (20 results by default, 100 maximum).
- Accept only workspace-relative Markdown paths; enforce workspace boundaries and omit symlinks, hidden non-Markdown files, and `.marnote-trash`.
- Read canonical files and reuse workspace/search behavior; any index is disposable. Return bounded results without unrelated absolute paths.
- Defer writes, Git, backlinks, and semantic search. Document generic stdio setup and workspace configuration.

## Implemented

- Core desktop editing uses local files. Git UI and MCP server are not implemented.
- The header can copy the active note as Markdown.
