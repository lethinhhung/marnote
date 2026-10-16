export function NoteFooter({ value, path }: { value: string; path: string }) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const characters = value.length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return <footer className="note-footer">
    <div className="note-footer-stats"><span>{words.toLocaleString()} words</span><b>·</b><span>{characters.toLocaleString()} characters</span><b>·</b><span>{minutes} min read</span></div>
    <span className="note-footer-path">{path ? `Synced with disk: ${path}` : "Markdown"}</span>
    <span className="note-footer-format">UTF-8 <b>·</b> Markdown</span>
  </footer>;
}
