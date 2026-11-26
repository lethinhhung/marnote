import { File, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { EmojiPicker } from "../../shared/ui/EmojiPicker";
import { tagStyle } from "../../shared/ui/tagStyle";
import { requestTagEdit } from "../../shared/ui/tagEditRequest";
import type { WorkspaceEntryMetadata } from "../../shared/domain/workspace";

export function NoteHeader({ value, heading, metadata, path, updateMetadata, tagColors }: { value: string; heading: ReactNode; metadata?: WorkspaceEntryMetadata; path: string; updateMetadata: (path: string, metadata: { icon?: string }) => void; tagColors: Record<string, string> }) {
  const selectedTags = metadata?.tags ?? [];
  return (
    <div className="note-heading">
      <EmojiPicker value={metadata?.icon} label="Change note icon" fallback={value.length === 0 ? <File size={28} strokeWidth={1.5} /> : <FileText size={28} strokeWidth={1.5} />} onChange={icon => updateMetadata(path, { icon })} />
      {heading}
      {selectedTags.length > 0 && (
        <div className="note-meta"><span className="note-meta-tags">{selectedTags.map(tag => { const color = tagColors[tag] ?? "#526b58"; return <button type="button" key={tag} className="note-meta-tag" style={tagStyle(color, "#f8f7f4")} onClick={() => requestTagEdit(tag)} title={`Edit ${tag}`}>#{tag}</button>; })}</span></div>
      )}
    </div>
  );
}
