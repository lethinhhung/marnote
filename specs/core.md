## Product

- Marnote is a local-first, Notion-like note application.
- Primary users:
  - Normal users who want simple, reliable note-taking.
- Secondary users:
  - Developers and advanced users who want Markdown, Git, project docs, and AI integrations.
- Primary use cases:
  - Everyday note-taking.
  - Personal knowledge organization.
  - Software project documentation and specs.
  - Providing workspace context to external LLMs and coding tools through MCP.
- Core functionality must work fully offline.

## Principles

- Local-first by default.
- Markdown is the source of truth.
- Users fully own their files and data.
- Filesystem structure maps naturally to workspace structure.
- Prefer portable, inspectable formats over proprietary storage.
- Keep the default experience simple for normal users.
- Advanced features should not complicate basic note-taking.
- AI integrations should be external and interoperable.
- Avoid vendor lock-in.

## Workspace

- A workspace points to a local directory.
- Provide a persistent built-in workspace for everyday notes, stored as Markdown files in local app data.
- Users can also open and switch to other local workspaces.
- Supports deeply nested folders.
- Folders map to filesystem directories.
- Notes map to Markdown files.
- Notes can link to other notes.
- Internal links should remain portable and resolvable after moves or renames.
- Opening an existing folder should not require migration.

## Files

- Markdown files are the canonical persisted format.
- File operations map directly to filesystem operations:
  - Create.
  - Rename.
  - Move.
  - Delete.
- Essential note content must not depend on an internal database.
- App-specific metadata should remain minimal.
- Existing Markdown files must remain usable outside Marnote.
- External file changes should be detected and safely reloaded.

## Editor

- Provide a clean block-based editing experience similar to Notion.
- Editor content must serialize reliably to Markdown.
- Core blocks:
  - Paragraph.
  - Headings.
  - Bullet and numbered lists.
  - Task lists.
  - Quotes.
  - Code blocks.
  - Tables.
  - Dividers.
- Support linking to other notes.
- Common Markdown should round-trip without destructive changes.
- Tables should serialize as standard Markdown table syntax.
- Opening or synchronizing a note must not save editor normalization; autosave only after a user edit.
- Avoid editor features that cannot map cleanly to Markdown.

## Project Workspace

- Users may open a software repository as a workspace.
- Marnote should surface documentation while hiding unrelated source files by default.
- Common documentation targets:
  - `*.md`
  - `docs/**`
  - `specs/**`
- Ignore rules should be configurable.
- Project workspace is an advanced feature of the main note app, not a separate product.

## Search & Links

- Search must work fully offline.
- Search across:
  - Titles.
  - File paths.
  - Folder names.
  - Markdown content.
- Maintain note relationships for:
  - Internal links.
  - Backlinks.
- Local indexes are disposable and rebuildable.
- Markdown files remain the source of truth.

## MCP

- Marnote exposes an MCP server for external AI and coding tools.
- Target clients include Claude Code, Codex, Cursor, and OpenCode.
- AI tools should be able to retrieve relevant context without reading the entire workspace.
- MCP retrieval should support:
  - Browse workspace structure.
  - Read notes.
  - Search notes.
  - Find linked notes.
  - Retrieve backlinks.
  - Retrieve relevant notes for a query.
- MCP write operations should support:
  - Create.
  - Update.
  - Rename or move.
  - Delete.
- MCP must reuse the same workspace and file services as the UI.
- No separate AI-only representation of notes.
- Writes must be explicit and auditable.

## Git

- Git support is an optional advanced feature.
- Marnote should work well inside Git-managed workspaces.
- Markdown changes should produce clean diffs.
- Avoid unnecessary file reformatting.
- Preserve unchanged content where practical.
- Git must not be required for normal note-taking.

## Data Safety

- Never overwrite user content silently.
- Detect conflicting external changes before destructive writes.
- Prefer atomic writes where possible.
- Keep deletions recoverable where practical.
- Users must remain free to edit files with external tools.

## Platform

- Desktop is the initial primary platform.
- macOS is the first-class initial target.
- Architecture should allow Windows and Linux later.
- Mobile support may be added later.

## Architecture

- Prefer TypeScript across shared application code.
- Keep core domains separated:
  - Workspace.
  - Filesystem.
  - Markdown.
  - Editor.
  - Search.
  - Links.
  - MCP.
  - Git.
- UI should not directly own filesystem logic.
- MCP and UI should share the same core services.
- Platform-specific functionality should stay behind adapters.
