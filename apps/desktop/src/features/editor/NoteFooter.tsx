import { useEffect } from "react";
import { Star, Edit2, FileText, Folder } from "lucide-react";
import { EmojiPicker } from "../../shared/ui/EmojiPicker";
import { TagPicker } from "./TagPicker";
import { calculateNoteStats } from "./noteStats";
import { tagTextColor } from "../../shared/ui/tagStyle";
import { requestTagEdit } from "../../shared/ui/tagEditRequest";
import type { UpdateEntryMetadataInput } from "../../platform/workspace";
import type { WorkspaceEntryMetadata } from "../../shared/domain/workspace";

function formatTimestamp(ms?: number): string | null {
  if (!ms) return null;
  const date = new Date(ms);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function NoteFooter({ value, path, kind, saveStatus, metadata, updateMetadata, tags = {}, updateTagColor, editTag }: { value: string; path: string; kind: "note" | "folder"; saveStatus: "saved" | "saving" | "error"; metadata?: WorkspaceEntryMetadata; updateMetadata?: (path: string, metadata: UpdateEntryMetadataInput) => void; tags?: Record<string, string>; updateTagColor?: (name: string, color: string) => void; editTag?: (oldName: string, newName: string, color: string) => void }) {
  const { words, characters, readingTimeMinutes } = calculateNoteStats(value);
  const selectedTags = metadata?.tags ?? [];

  const handleToggleFavorite = () => {
    if (!updateMetadata || !path) return;
    updateMetadata(path, { favorite: !metadata?.favorite });
  };

  return <footer className="note-footer">
    {kind === "note" && <div className="note-footer-stats"><span>{words.toLocaleString()} words</span><b>·</b><span>{characters.toLocaleString()} characters</span><b>·</b><span>{readingTimeMinutes} min read</span></div>}
    <div className="note-footer-meta">
      {metadata?.createdMs && <span className="note-footer-timestamp" title="Created"><Edit2 size={10} /> {formatTimestamp(metadata.createdMs)}</span>}
      {metadata?.updatedMs && <span className="note-footer-timestamp" title="Updated"><Edit2 size={10} /> {formatTimestamp(metadata.updatedMs)}</span>}
      {updateMetadata && path && <TagPicker selected={selectedTags} tags={tags} onChange={value => updateMetadata(path, { tags: value })} onColor={(name, color) => updateTagColor?.(name, color)} onEdit={editTag ?? (() => {})} />}
      {selectedTags.length > 0 && <span className="note-footer-tags">{selectedTags.map(tag => { const color = tags[tag] ?? "#eff1eb"; return <span key={tag} className="note-footer-tag-wrap" style={{ backgroundColor: color, color: tagTextColor(color) }}><button type="button" className="note-footer-tag" onClick={() => requestTagEdit(tag)} title={`Edit ${tag}`}>#{tag}</button><button type="button" className="note-footer-tag-remove" aria-label={`Remove ${tag}`} onClick={() => updateMetadata?.(path, { tags: selectedTags.filter(value => value !== tag) })}>×</button></span>; })}</span>}
      {updateMetadata && path && <EmojiPicker value={metadata?.icon} label={`Choose ${kind} emoji`} fallback={kind === "folder" ? <Folder size={12} /> : <FileText size={12} />} onChange={icon => updateMetadata(path, { icon })} />}
      <button className={`note-footer-action ${metadata?.favorite ? "active" : ""}`} onClick={handleToggleFavorite} aria-label={metadata?.favorite ? "Remove favorite" : "Add favorite"} title={metadata?.favorite ? "Remove favorite" : "Add favorite"}><Star size={12} fill={metadata?.favorite ? "currentColor" : "none"} /></button>
    </div>
    {kind === "note" && <span className={`note-footer-save ${saveStatus}`} role="status"><i />{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "Saved"}</span>}
    <span className="note-footer-path">{path || "Markdown"}</span>
  </footer>;
}
