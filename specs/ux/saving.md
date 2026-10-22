# Saving

## Autosave

- After a user edits a note, wait briefly for typing to pause, then save the draft automatically.
- Show **Saving…**, **Saved**, or **Save failed** in the note footer. Mark the active tab as unsaved while its draft differs from disk or a save is in progress or has failed.
- A newly opened or externally synchronized note is not dirty solely because the editor normalized its representation. Autosave starts only after a user edit.

## Save safeguards

- Before switching the active note or workspace, or closing its tab, attempt to save the current draft. If the save fails, keep the current note and draft open and show an error.
- Apply the same safeguard to **Close others** and **Close all**.
- When a note changes outside Marnote, offer **Load external version** and **Keep mine**. Loading replaces the draft with disk content; keeping the draft acknowledges the external version and allows the user's content to remain active.

## Recovery

- Restore open tabs and their unsaved drafts after restart.
- Until restoration is implemented, communicate that unsaved drafts may not survive app restart.

## Save modes

- Autosave is the available mode; there is no manual-save toggle or user-facing save command.
