Inspect the codebase and relevant specs to find one meaningful behavior that lacks a focused unit test. Keep the work small: inspect no more than six directly related implementation and test files, and add or update at most two test files.

Add tests only. Do not change production code, configuration, documentation, or generated files. Prefer tests for user-visible or public behavior over implementation details. Do not add tests for speculative edge cases or duplicate existing coverage. Follow the repository's test conventions and `AGENTS.md` rules.

If you cannot identify a concrete coverage gap that can be tested without production changes, leave the repository unchanged. Do not install dependencies or run tests; the workflow runs `pnpm check` after your edits. Before finishing, review the final diff to confirm it contains only focused tests and has no obvious lint or type errors. Do not claim checks passed unless they were actually run. Do not commit or push.
