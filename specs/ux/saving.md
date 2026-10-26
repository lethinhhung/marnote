# Saving

## Save modes

- Keep **Save** at the right side of the editor formatting toolbar in both modes. Disable it when there are no unsaved changes or while a save is in progress.
- Show an **Automatic / Manual** segmented control beside the save status in the note footer. The selection applies across workspaces and restarts.
- In **Automatic**, save after a user pauses editing.
- Switching from Manual to Automatic schedules any pending draft for autosave.
- In **Manual**, edits stay as drafts until **Save**, `⌘S` / `Ctrl+S`, or the user chooses **Save** in a close or workspace switch prompt. Switching tabs preserves each tab's draft without prompting.
- **Save** writes the current draft immediately in either mode.
- The unsaved status and tab indicator remain visible in Manual mode.

## Save status

- In Automatic mode, wait briefly for typing to pause, then save the draft automatically.
- Show **Saving…**, **Saved**, or **Save failed** in the note footer. Mark the active tab as unsaved while its draft differs from disk or a save is in progress or has failed.
- A newly opened or externally synchronized note is not dirty solely because the editor normalized its representation. Automatic saving starts only after a user edit.

## Save safeguards

- In **Automatic**, before switching the active note or workspace, or closing its tab, attempt to save the current draft. If the save fails, keep the current note and draft open and show an error.
- In **Manual**, before switching workspaces, closing tabs, or closing the app with unsaved changes, list every unsaved note with **Save** and **Discard** buttons. Each choice immediately resolves that note and removes it from the list. Provide **Save all**, **Discard all**, and **Cancel** actions for the remaining notes. A failed save keeps that note in the list and shows an error; **Cancel** keeps the current action from proceeding.
- In **Manual**, switching tabs stores the current draft and opens the selected tab without a prompt.
- Apply the same safeguard to **Close others** and **Close all**.
- When a note changes outside Marnote, offer **Load external version** and **Keep mine**. Loading replaces the draft with disk content; keeping the draft acknowledges the external version and allows the user's content to remain active.

## Recovery

- Restore open tabs, their order, the active note, and their drafts for each workspace after restart.
