# Repository guidance

- Use TypeScript for application and shared package code.
- Keep each code file under 120 lines. Generated files, package/configuration files, and other machine-maintained files are exempt.
- Split code into focused modules when a file approaches the limit.
- Follow the product and architecture constraints in `specs/`.
- For shared features or fixes, inspect both `apps/desktop` and `apps/web` and implement the behavior on both platforms. Follow explicit platform-specific scope or exclusions in `specs/`; document intentional differences there.
- Keep specs concise; prefer simple, clear guidance over complicated or redundant detail.
