Inspect the repository and follow AGENTS.md and every relevant file in specs/.

Identify one concrete bug and establish its likely root cause before editing. Implement the smallest safe fix and add or update a regression test when appropriate. Do not fix speculative issues or include generated build/schema artifacts. Do not run the full validation suite; the workflow runs `pnpm check` after your edits. If there is no concrete bug with reasonable evidence, leave the repository unchanged. Do not commit or push.
