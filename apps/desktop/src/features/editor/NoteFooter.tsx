import { calculateNoteStats } from "./noteStats";

export function NoteFooter({ value, path, saveStatus }: { value: string; path: string; saveStatus: "saved" | "saving" | "error" }) {
  const { words, characters, readingTimeMinutes } = calculateNoteStats(value);
  return <footer className="note-footer">
    <div className="note-footer-stats"><span>{words.toLocaleString()} words</span><b>·</b><span>{characters.toLocaleString()} characters</span><b>·</b><span>{readingTimeMinutes} min read</span></div>
    <span className={`note-footer-save ${saveStatus}`} role="status"><i />{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "Saved"}</span>
    <span className="note-footer-path">{path || "Markdown"}</span>
    <span className="note-footer-format">UTF-8 <b>·</b> Markdown</span>
  </footer>;
}
