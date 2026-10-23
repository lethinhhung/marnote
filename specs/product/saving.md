# Saving

## Requirements

- Autosave note drafts after a brief pause following a user edit. Saving must not be required for ordinary editing.
- Opening or synchronizing a note must not persist editor normalization; only user edits make a draft eligible for autosave.
- Provide save status so users can tell when a draft is being written, persisted, or could not be saved.
- In Automatic mode, attempt to save the current draft before navigation that would replace it or before closing its tab. In Manual mode, switching tabs preserves each draft without a prompt; before switching workspaces, closing tabs, or closing the app, list all unsaved notes with individual Save and Discard buttons, plus Save all, Discard all, and Cancel actions. Individual choices resolve immediately and remove the note from the list. A failed save must preserve the affected draft and prevent that action.
- Detect external file changes and let users load the disk version or keep their draft before overwriting changed content.
- Preserve open tabs and their drafts across app restarts, scoped to each workspace.

## Modes

- Support **Automatic** and **Manual** save modes. Persist the selected mode app-wide across restarts and workspace switches.
- In Automatic mode, save after a brief pause following a user edit.
- In Manual mode, retain edits as drafts until the user saves explicitly or chooses Save in a close or workspace switch prompt. Switching tabs preserves the draft without prompting.
- Both modes use the same save status, external-change protection, and failure safeguards.
- A successful save updates the note's **Updated** timestamp while preserving **Created**.

## Implemented

- Automatic and Manual modes are available through an app-wide footer control; the selection persists across restarts.
- A **Save** button in the editor toolbar and `⌘S` / `Ctrl+S` save immediately in either mode; navigation and close safeguards also save pending drafts.
- Open tabs, tab order, recent selection order, active note, and drafts are restored per workspace from local app storage.
