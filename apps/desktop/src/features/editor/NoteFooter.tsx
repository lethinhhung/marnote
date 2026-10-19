import { Star, Edit2, Clock3, Folder } from "lucide-react";
import { EmojiPicker } from "../../shared/ui/EmojiPicker";
import { TagPicker } from "./TagPicker";
import { calculateNoteStats } from "./noteStats";
import { tagStyle } from "../../shared/ui/tagStyle";
import { requestTagEdit } from "../../shared/ui/tagEditRequest";
import type { UpdateEntryMetadataInput } from "../../platform/workspace";
import type { WorkspaceEntryMetadata } from "../../shared/domain/workspace";

function formatTimestamp(ms?: number): string | null {
  if (!ms) return null;
  const date = new Date(ms);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function NoteFooter({ value, path, kind, saveStatus, metadata, updateMetadata, tags = {}, tagUsageCounts = {}, updateTagColor, editTag }: { value: string; path: string; kind: "note" | "folder"; saveStatus: "saved" | "saving" | "error"; metadata?: WorkspaceEntryMetadata; updateMetadata?: (path: string, metadata: UpdateEntryMetadataInput) => void; tags?: Record<string, string>; tagUsageCounts?: Record<string, number>; updateTagColor?: (name: string, color: string) => void; editTag?: (oldName: string, newName: string, color: string) => void }) {
  const { words, characters, readingTimeMinutes } = calculateNoteStats(value);
  const selectedTags = metadata?.tags ?? [];
  const hasCreated = !!metadata?.createdMs;
  const hasUpdated = !!metadata?.updatedMs;
  const hasTagGroup = !!(updateMetadata && path) || selectedTags.length > 0;
  const hasIconGroup = !!(updateMetadata && path);

  const handleToggleFavorite = () => {
    if (!updateMetadata || !path) return;
    updateMetadata(path, { favorite: !metadata?.favorite });
  };

  return <footer className="note-footer">
    <div className="note-footer-left">
      {hasCreated && <span className="note-footer-timestamp" title="Created"><Edit2 size={12} />{formatTimestamp(metadata?.createdMs)}</span>}
      {hasCreated && (hasUpdated || hasTagGroup || hasIconGroup) && <span className="note-footer-divider">|</span>}
      {hasUpdated && <span className="note-footer-timestamp" title="Updated"><Clock3 size={12} />{formatTimestamp(metadata?.updatedMs)}</span>}
      {hasUpdated && (hasTagGroup || hasIconGroup) && <span className="note-footer-divider">|</span>}
      {hasTagGroup && <span className="note-footer-tag-group">{updateMetadata && path && <TagPicker selected={selectedTags} tags={tags} usageCounts={tagUsageCounts} onChange={value => updateMetadata(path, { tags: value })} onColor={(name, color) => updateTagColor?.(name, color)} onEdit={editTag ?? (() => {})} />}
        {selectedTags.length > 0 && <span className="note-footer-tags">{selectedTags.map(tag => { const color = tags[tag] ?? "#526b58"; return <span key={tag} className="note-footer-tag-wrap" style={tagStyle(color)}><button type="button" className="note-footer-tag" onClick={() => requestTagEdit(tag)} title={`Edit ${tag}`}>#{tag}</button><button type="button" className="note-footer-tag-remove" aria-label={`Remove ${tag}`} onClick={() => updateMetadata?.(path, { tags: selectedTags.filter(value => value !== tag) })}>×</button></span>; })}</span>}
      </span>}
      {hasIconGroup && <span className="note-footer-icon-group"><EmojiPicker value={metadata?.icon} label={`Choose ${kind} emoji`} fallback={kind === "folder" ? <Folder size={12} /> : "👨‍🌾"} onChange={icon => updateMetadata?.(path, { icon })} /><button className={`note-footer-action ${metadata?.favorite ? "active" : ""}`} onClick={handleToggleFavorite} aria-label={metadata?.favorite ? "Remove favorite" : "Add favorite"} title={metadata?.favorite ? "Remove favorite" : "Add favorite"}><Star size={12} fill={metadata?.favorite ? "currentColor" : "none"} /></button></span>}
      {kind === "note" && hasIconGroup && <span className="note-footer-divider">|</span>}
      {kind === "note" && <><span className={`note-footer-save ${saveStatus}`} role="status"><i />{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "Saved"}</span><span className="note-footer-divider">|</span></>}
      <span className="note-footer-path">{path || "Markdown"}</span>
    </div>
    {kind === "note" && <div className="note-footer-stats"><span>{words.toLocaleString()} words</span><b>·</b><span>{characters.toLocaleString()} characters</span><b>·</b><span>{readingTimeMinutes} min read</span></div>}
  </footer>;
}
