# Testing

- Keep tests focused: unit tests cover isolated logic; integration tests cover boundaries between processes, platform APIs, and the filesystem.
- `pnpm test:unit` runs on pull requests and after merge; `pnpm test:integration` runs after merge only.
- `pnpm test` runs both suites locally; `pnpm check` runs unit tests only.
- Prioritize data safety, especially saves, external changes, workspace paths and file operations, and Markdown round-trips.
- MCP stdio subprocess tests are integration tests. Rust tests using temporary workspaces are unit or command-level tests unless they exercise a real cross-process boundary.
