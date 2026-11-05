import { forwardRef } from "react";
import { Star, Edit2, Clock3, Info, MoreHorizontal } from "lucide-react";
import { EmojiPicker } from "../../shared/ui/EmojiPicker";
import { NoteFooterTags } from "./NoteFooterTags";
import { calculateNoteStats } from "./noteStats";

type Props = {
  value: string;
  path: string;
  kind: "note" | "folder";
  saveStatus: "saved" | "saving" | "error";
  saveMode: "automatic" | "manual";
  dirty: boolean;
  onSaveModeChange: (mode: "automatic" | "manual") => void;
  metadata?: { createdMs?: number; updatedMs?: number; tags?: string[]; icon?: string; favorite?: boolean };
  updateMetadata?: (path: string, metadata: { icon?: string; tags?: string[]; favorite?: boolean }) => void;
  tags?: Record<string, string>;
  compact: boolean;
  positionFooterMenus: (footer: HTMLElement) => void;
};

function formatTimestamp(ms?: number) {
  if (!ms) return null;
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const Timestamp = ({ hasCreated, hasUpdated, metadata }: { hasCreated: boolean; hasUpdated: boolean; metadata?: Props["metadata"] }) => (
  <>
    {hasCreated && <span className="note-footer-timestamp"><Edit2 size={12} />Created {formatTimestamp(metadata?.createdMs)}</span>}
    {hasUpdated && <span className="note-footer-timestamp"><Clock3 size={12} />Updated {formatTimestamp(metadata?.updatedMs)}</span>}
  </>
);

const SaveStatus = ({ saveStatus, dirty }: { saveStatus: Props["saveStatus"]; dirty: boolean }) => (
  <span className={`note-footer-save ${saveStatus}`} role="status"><i />{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : dirty ? "Unsaved changes" : "Saved"}</span>
);

const SaveOptions = ({ saveMode, onSaveModeChange }: { saveMode: Props["saveMode"]; onSaveModeChange: Props["onSaveModeChange"] }) => (
  <span className="save-mode-control" role="group" aria-label="Save mode"><button type="button" aria-pressed={saveMode === "automatic"} onClick={() => onSaveModeChange("automatic")}>Automatic</button><button type="button" aria-pressed={saveMode === "manual"} onClick={() => onSaveModeChange("manual")}>Manual</button></span>
);

const Stats = ({ words, characters, readingTimeMinutes, compact }: { words: number; characters: number; readingTimeMinutes: number; compact: boolean }) => (
  <div className="note-footer-stats"><span>{words.toLocaleString()} words</span><b>·</b><span>{characters.toLocaleString()} {compact ? "chars" : "characters"}</span><b>·</b><span>{readingTimeMinutes} min{compact ? "" : " read"}</span></div>
);

const IconControls = ({ kind, metadata, updateMetadata, path, handleToggleFavorite }: { kind: Props["kind"]; metadata?: Props["metadata"]; updateMetadata: Props["updateMetadata"]; path: string; handleToggleFavorite: () => void }) => (
  <span className="note-footer-icon-group"><EmojiPicker value={metadata?.icon} label={`Choose ${kind} emoji`} buttonText="Add emoji" fallback={kind === "folder" ? <span>📁</span> : <span>📄</span>} onChange={icon => updateMetadata?.(path, { icon })} /><button className={`note-footer-action ${metadata?.favorite ? "active" : ""}`} onClick={handleToggleFavorite} aria-label={metadata?.favorite ? "Remove favorite" : "Add favorite"} title={metadata?.favorite ? "Remove favorite" : "Add favorite"}><Star size={12} fill={metadata?.favorite ? "currentColor" : "none"} /></button></span>
);

const TagsControl = ({ hasTagGroup, selectedTags, tags, updateMetadata, path }: { hasTagGroup: boolean; selectedTags: string[]; tags: Props["tags"]; updateMetadata: Props["updateMetadata"]; path: string }) => {
  if (!hasTagGroup) return null;
  return updateMetadata && path ? <NoteFooterTags selectedTags={selectedTags} tags={tags ?? {}} updateMetadata={updateMetadata} path={path} /> : <span className="note-footer-tag-group" />;
};

export const NoteFooterContent = forwardRef<HTMLElement, Props>(({ value, path, kind, saveStatus, saveMode, dirty, onSaveModeChange, metadata, updateMetadata, tags = {}, compact, positionFooterMenus }: Props) => {
  const { words, characters, readingTimeMinutes } = calculateNoteStats(value);
  const selectedTags = metadata?.tags ?? [];
  const hasCreated = !!metadata?.createdMs;
  const hasUpdated = !!metadata?.updatedMs;
  const hasTagGroup = !!(updateMetadata && path) || selectedTags.length > 0;
  const hasIconGroup = !!(updateMetadata && path);
  const handleToggleFavorite = () => { if (!updateMetadata || !path) return; updateMetadata(path, { favorite: !metadata?.favorite }); };

  return (
    <footer className={`note-footer${compact ? " compact" : ""}`}>
      {compact ? (
        <>
          {kind === "note" && <SaveStatus saveStatus={saveStatus} dirty={dirty} />}
          <span className="note-footer-path" title={path}>{path || "Markdown"}</span>
          {kind === "note" && <Stats words={words} characters={characters} readingTimeMinutes={readingTimeMinutes} compact={true} />}
          {kind === "note" && (
            <details className="note-footer-menu note-footer-info" onToggle={event => positionFooterMenus(event.currentTarget.closest("footer")!)}><summary aria-label="Note information" title="Note information"><Info size={14} /></summary><div className="note-footer-popup"><Timestamp hasCreated={hasCreated} hasUpdated={hasUpdated} metadata={metadata} /></div></details>
          )}
          <details className="note-footer-menu" onToggle={event => positionFooterMenus(event.currentTarget.closest("footer")!)}><summary aria-label="More note options" title="More note options"><MoreHorizontal size={16} /></summary><div className="note-footer-popup"><TagsControl hasTagGroup={hasTagGroup} selectedTags={selectedTags} tags={tags} updateMetadata={updateMetadata} path={path} />{hasIconGroup && <IconControls kind={kind} metadata={metadata} updateMetadata={updateMetadata} path={path} handleToggleFavorite={handleToggleFavorite} />}{kind === "note" && <SaveOptions saveMode={saveMode} onSaveModeChange={onSaveModeChange} />}</div></details>
        </>
      ) : (
        <>
          <div className="note-footer-left"><Timestamp hasCreated={hasCreated} hasUpdated={hasUpdated} metadata={metadata} /><TagsControl hasTagGroup={hasTagGroup} selectedTags={selectedTags} tags={tags} updateMetadata={updateMetadata} path={path} />{hasIconGroup && <IconControls kind={kind} metadata={metadata} updateMetadata={updateMetadata} path={path} handleToggleFavorite={handleToggleFavorite} />}{kind === "note" && <> <SaveStatus saveStatus={saveStatus} dirty={dirty} /><SaveOptions saveMode={saveMode} onSaveModeChange={onSaveModeChange} /></>}<span className="note-footer-path" title={path}>{path || "Markdown"}</span></div>
          {kind === "note" && <Stats words={words} characters={characters} readingTimeMinutes={readingTimeMinutes} compact={false} />}
        </>
      )}
    </footer>
  );
});
NoteFooterContent.displayName = "NoteFooterContent";