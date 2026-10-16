export function NoteFooter({ value, path, saveStatus }: { value: string; path: string; saveStatus: "saved" | "saving" | "error" }) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const characters = value.length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return <footer className="note-footer">
    <div className="note-footer-stats"><span>{words.toLocaleString()} words</span><b>·</b><span>{characters.toLocaleString()} characters</span><b>·</b><span>{minutes} min read</span></div>
    <span className={`note-footer-save ${saveStatus}`} role="status"><i />{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "Saved"}</span>
    <span className="note-footer-path">{path || "Markdown"}</span>
    <span className="note-footer-format">UTF-8 <b>·</b> Markdown</span>
  </footer>;
}
