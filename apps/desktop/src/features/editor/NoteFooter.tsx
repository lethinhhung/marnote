import { useState } from "react";
import { Star, Tag, Smile, Edit2 } from "lucide-react";
import { calculateNoteStats } from "./noteStats";
import type { UpdateEntryMetadataInput } from "../../platform/workspace";
import type { WorkspaceEntryMetadata } from "../../shared/domain/workspace";

function formatTimestamp(ms?: number): string | null {
  if (!ms) return null;
  const date = new Date(ms);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function NoteFooter({ value, path, saveStatus, metadata, updateMetadata }: { value: string; path: string; saveStatus: "saved" | "saving" | "error"; metadata?: WorkspaceEntryMetadata; updateMetadata?: (path: string, metadata: UpdateEntryMetadataInput) => void }) {
  const { words, characters, readingTimeMinutes } = calculateNoteStats(value);
  const [editingTags, setEditingTags] = useState(false);
  const [tagsInput, setTagsInput] = useState(metadata?.tags?.join(", ") ?? "");
  const [editingIcon, setEditingIcon] = useState(false);
  const [iconInput, setIconInput] = useState(metadata?.icon ?? "");

  const handleSaveTags = () => {
    if (!updateMetadata || !path) return;
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    updateMetadata(path, { tags });
    setEditingTags(false);
  };

  const handleSaveIcon = () => {
    if (!updateMetadata || !path) return;
    updateMetadata(path, { icon: iconInput.trim() || undefined });
    setEditingIcon(false);
  };

  const handleToggleFavorite = () => {
    if (!updateMetadata || !path) return;
    updateMetadata(path, { favorite: !metadata?.favorite });
  };

  return <footer className="note-footer">
    <div className="note-footer-stats"><span>{words.toLocaleString()} words</span><b>·</b><span>{characters.toLocaleString()} characters</span><b>·</b><span>{readingTimeMinutes} min read</span></div>
    <div className="note-footer-meta">
      {metadata?.createdMs && <span className="note-footer-timestamp" title="Created"><Edit2 size={10} /> {formatTimestamp(metadata.createdMs)}</span>}
      {metadata?.updatedMs && <span className="note-footer-timestamp" title="Updated"><Edit2 size={10} /> {formatTimestamp(metadata.updatedMs)}</span>}
      {editingTags ? <div className="note-footer-edit"><input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveTags()} onBlur={handleSaveTags} autoFocus placeholder="Tags (comma separated)" /><button onClick={handleSaveTags} aria-label="Save tags">Save</button></div> : metadata?.tags && metadata.tags.length > 0 ? <span className="note-footer-tags">{metadata.tags.map(tag => <span key={tag} className="note-footer-tag">#{tag}</span>)}</span> : null}
      <button className="note-footer-action" onClick={() => setEditingTags(!editingTags)} aria-label={editingTags ? "Done editing tags" : "Edit tags"}><Tag size={12} /></button>
      {editingIcon ? <div className="note-footer-edit"><input type="text" value={iconInput} onChange={e => setIconInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveIcon()} onBlur={handleSaveIcon} autoFocus placeholder="Emoji icon" maxLength={2} /><button onClick={handleSaveIcon} aria-label="Save icon">Save</button></div> : metadata?.icon ? <span className="note-footer-icon" style={{ fontSize: 14 }}>{metadata.icon}</span> : null}
      <button className="note-footer-action" onClick={() => setEditingIcon(!editingIcon)} aria-label={editingIcon ? "Done editing icon" : "Edit emoji icon"}><Smile size={12} /></button>
      <button className={`note-footer-action ${metadata?.favorite ? "active" : ""}`} onClick={handleToggleFavorite} aria-label={metadata?.favorite ? "Remove favorite" : "Add favorite"}><Star size={12} fill={metadata?.favorite ? "currentColor" : "none"} /></button>
    </div>
    <span className={`note-footer-save ${saveStatus}`} role="status"><i />{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "Saved"}</span>
    <span className="note-footer-path">{path || "Markdown"}</span>
    <span className="note-footer-format">UTF-8 <b>·</b> Markdown</span>
  </footer>;
}
