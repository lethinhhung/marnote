# Web MVP

## Goal

- Offer Marnote's core note-taking experience in a browser with no account or server-side note storage.
- Keep the MVP focused on one default workspace and everyday personal notes.
- Treat browser storage as a local working copy, not as a user-controlled folder of Markdown files.

## Workspace and storage

- Start directly in one default workspace; workspace switching and opening arbitrary folders are out of scope.
- Persist notes, folders, and workspace metadata in IndexedDB. Use `localStorage` only for small preferences.
- Request persistent browser storage when available and handle quota errors without losing drafts silently.
- Explain that browser data is scoped to the browser profile and site, and can be cleared by the user or browser.
- Core note editing must work offline after the web app has loaded.

## Portability and recovery

- Allow downloading an individual note as a standard `.md` file.
- Allow exporting the full workspace as a ZIP that preserves folder paths and includes Marnote metadata needed to restore tags, icons, favorites, and ordering.
- Allow importing a previously exported workspace ZIP to restore or move notes between browsers. Validate paths and reject unsafe archive entries.
- Keep export and import explicit user actions; report failures and never silently replace existing workspace data.

## MVP scope

- Reuse the existing editor and core note-taking workflows where practical: nested folders, Markdown editing, links, search, and autosave.
- Exclude multiple workspaces, arbitrary filesystem workspaces, sync, Git, and MCP from the web MVP.
- Browser directory access may be evaluated later; it must not be required for the MVP.
- Do not describe browser storage as equivalent to direct filesystem storage or as a substitute for backups.

## Public web metadata

- The web build provides a descriptive page title, search description, Open Graph and Twitter share metadata, and crawler access. It uses `https://marnote.vercel.app` for canonical URLs and the sitemap by default; set `VITE_SITE_URL` to override it. The desktop app has no public page metadata.
