# Testing

- Keep tests focused: unit tests cover isolated logic; integration tests cover boundaries between processes, platform APIs, and the filesystem.
- Run unit tests on pull requests and after merge.
- Run integration tests after merge.
- Prioritize data safety, especially saves, external changes, workspace paths and file operations, and Markdown round-trips.
- MCP stdio subprocess tests are integration tests. Rust tests using temporary workspaces are unit or command-level tests unless they exercise a real cross-process boundary.
