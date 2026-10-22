# Saving

## Requirements

- Autosave note drafts after a brief pause following a user edit. Saving must not be required for ordinary editing.
- Opening or synchronizing a note must not persist editor normalization; only user edits make a draft eligible for autosave.
- Provide save status so users can tell when a draft is being written, persisted, or could not be saved.
- Attempt to save the current draft before navigation that would replace it or before closing its tab. A failed save must preserve the draft and prevent that action.
- Detect external file changes and let users load the disk version or keep their draft before overwriting changed content.
- Preserve recoverable drafts across app restarts, including the tabs they belong to.

## Modes

- Autosave is the supported editing mode.
- A user-selectable manual-save mode is not part of the current product requirements. Add one only with an explicit product decision covering save commands, dirty indicators, navigation and close behavior, and preference scope.
