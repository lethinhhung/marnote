import { FilePlus2 } from "lucide-react";

export function NoNoteOpened({ canCreate }: { canCreate: boolean }) {
  if (!canCreate) {
    return <div className="welcome no-workspace"><div className="doc-icon">✎</div>
      <h1>Open a workspace</h1><p>Open a local folder to browse its Markdown files.</p>
    </div>;
  }

  return <div className="empty-note-state" role="region" aria-labelledby="empty-note-title">
    <img className="empty-note-logo" src="/brand/mark.svg" alt="" aria-hidden="true" />
    <p className="empty-note-eyebrow">A little room to think</p>
    <h1 id="empty-note-title">Nothing open yet</h1>
    <p className="empty-note-copy">Choose a note from your workspace, or start with a fresh page.</p>
    <button className="empty-note-create" onClick={() => document.dispatchEvent(new CustomEvent("marnote-create-note"))}>
      <FilePlus2 size={15} strokeWidth={1.8} /> Create a note
    </button>
    <p className="empty-note-hint">Your notes stay in this workspace as Markdown files.</p>
  </div>;
}
