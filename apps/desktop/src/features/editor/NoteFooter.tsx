import { type FocusEvent, useEffect, useRef, useState } from "react";
import { Star, Edit2, Clock3, Folder, FileText, Info, MoreHorizontal } from "lucide-react";
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

function positionFooterMenus(footer: HTMLElement): void {
  footer.querySelectorAll<HTMLDetailsElement>(".note-footer-menu[open]").forEach(menu => {
    const trigger = menu.querySelector("summary")?.getBoundingClientRect();
    const popup = menu.querySelector<HTMLElement>(".note-footer-popup");
    if (!trigger || !popup) return;
    const bounds = popup.getBoundingClientRect();
    const left = Math.max(8, Math.min(trigger.right - bounds.width, window.innerWidth - bounds.width - 8));
    const above = trigger.top - bounds.height - 8;
    const top = above >= 8 ? above : Math.min(trigger.bottom + 8, window.innerHeight - bounds.height - 8);
    popup.style.left = `${left}px`;
    popup.style.top = `${Math.max(8, top)}px`;
    popup.dataset.positioned = "true";
  });
}

function closeMenuOnBlur(event: FocusEvent<HTMLDetailsElement>): void {
  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
  if (event.currentTarget.querySelector('.tag-picker-wrap [aria-expanded="true"], .emoji-picker [aria-expanded="true"]')) return;
  event.currentTarget.open = false;
}

export function NoteFooter({ value, path, kind, saveStatus, saveMode, dirty, onSaveModeChange, metadata, updateMetadata, tags = {}, tagUsageCounts = {}, updateTagColor, editTag }: { value: string; path: string; kind: "note" | "folder"; saveStatus: "saved" | "saving" | "error"; saveMode: "automatic" | "manual"; dirty: boolean; onSaveModeChange: (mode: "automatic" | "manual") => void; metadata?: WorkspaceEntryMetadata; updateMetadata?: (path: string, metadata: UpdateEntryMetadataInput) => void; tags?: Record<string, string>; tagUsageCounts?: Record<string, number>; updateTagColor?: (name: string, color: string) => void; editTag?: (oldName: string, newName: string, color: string) => void }) {
  const footerRef = useRef<HTMLElement>(null);
  const resizeTimer = useRef<number | undefined>(undefined);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      window.clearTimeout(resizeTimer.current);
      resizeTimer.current = window.setTimeout(() => {
        setCompact(entry.contentRect.width < 950);
        positionFooterMenus(footer);
      }, 100);
    });
    const reposition = () => positionFooterMenus(footer);
    const dismissMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      const targetElement = event.target instanceof Element ? event.target : null;
      footer.querySelectorAll<HTMLDetailsElement>(".note-footer-menu[open]").forEach(menu => {
        if (menu.contains(target)) return;
        const pickerOpen = menu.querySelector('.tag-picker-wrap [aria-expanded="true"], .emoji-picker [aria-expanded="true"]');
        if (pickerOpen && targetElement?.closest(".tag-picker-layer, .emoji-picker-popover")) return;
        menu.open = false;
      });
    };
    observer.observe(footer);
    window.addEventListener("resize", reposition);
    document.addEventListener("pointerdown", dismissMenus);
    return () => { observer.disconnect(); window.clearTimeout(resizeTimer.current); window.removeEventListener("resize", reposition); document.removeEventListener("pointerdown", dismissMenus); };
  }, []);
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

  const timestamps = <>
    {hasCreated && <span className="note-footer-timestamp"><Edit2 size={12} />Created {formatTimestamp(metadata?.createdMs)}</span>}
    {hasUpdated && <span className="note-footer-timestamp"><Clock3 size={12} />Updated {formatTimestamp(metadata?.updatedMs)}</span>}
  </>;
  const tagsControl = hasTagGroup && <span className="note-footer-tag-group">{updateMetadata && path && <TagPicker selected={selectedTags} tags={tags} usageCounts={tagUsageCounts} onChange={value => updateMetadata(path, { tags: value })} onColor={(name, color) => updateTagColor?.(name, color)} onEdit={editTag ?? (() => {})} />}{selectedTags.length > 0 && <span className="note-footer-tags">{selectedTags.map(tag => { const color = tags[tag] ?? "#526b58"; return <span key={tag} className="note-footer-tag-wrap" style={tagStyle(color)}><button type="button" className="note-footer-tag" onClick={() => requestTagEdit(tag)} title={`Edit ${tag}`}>#{tag}</button><button type="button" className="note-footer-tag-remove" aria-label={`Remove ${tag}`} onClick={() => updateMetadata?.(path, { tags: selectedTags.filter(value => value !== tag) })}>×</button></span>; })}</span>}</span>;
  const iconControls = hasIconGroup && <span className="note-footer-icon-group"><EmojiPicker value={metadata?.icon} label={`Choose ${kind} emoji`} buttonText="Add emoji" fallback={kind === "folder" ? <Folder size={12} /> : <FileText size={12} />} onChange={icon => updateMetadata?.(path, { icon })} /><button className={`note-footer-action ${metadata?.favorite ? "active" : ""}`} onClick={handleToggleFavorite} aria-label={metadata?.favorite ? "Remove favorite" : "Add favorite"} title={metadata?.favorite ? "Remove favorite" : "Add favorite"}><Star size={12} fill={metadata?.favorite ? "currentColor" : "none"} /></button></span>;
  const saveStatusView = <span className={`note-footer-save ${saveStatus}`} role="status"><i />{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : dirty ? "Unsaved changes" : "Saved"}</span>;
  const saveOptions = <span className="save-mode-control" role="group" aria-label="Save mode"><button type="button" aria-pressed={saveMode === "automatic"} onClick={() => onSaveModeChange("automatic")}>Automatic</button><button type="button" aria-pressed={saveMode === "manual"} onClick={() => onSaveModeChange("manual")}>Manual</button></span>;
  const stats = <div className="note-footer-stats"><span>{words.toLocaleString()} words</span><b>·</b><span>{characters.toLocaleString()} characters</span><b>·</b><span>{readingTimeMinutes} min read</span></div>;
  const compactStats = <div className="note-footer-stats"><span>{words.toLocaleString()} words</span><b>·</b><span>{characters.toLocaleString()} chars</span><b>·</b><span>{readingTimeMinutes} min</span></div>;
  return <footer ref={footerRef} className={`note-footer${compact ? " compact" : ""}`}>
    {compact ? <>
      {kind === "note" && saveStatusView}
      <span className="note-footer-path" title={path}>{path || "Markdown"}</span>
      {kind === "note" && compactStats}
      {kind === "note" && <details className="note-footer-menu note-footer-info" onBlur={closeMenuOnBlur} onToggle={event => positionFooterMenus(event.currentTarget.closest("footer")!)}><summary aria-label="Note information" title="Note information"><Info size={14} /></summary><div className="note-footer-popup">{timestamps}</div></details>}
      <details className="note-footer-menu" onBlur={closeMenuOnBlur} onToggle={event => positionFooterMenus(event.currentTarget.closest("footer")!)}><summary aria-label="More note options" title="More note options"><MoreHorizontal size={16} /></summary><div className="note-footer-popup">{tagsControl}{iconControls}{kind === "note" && saveOptions}</div></details>
    </> : <>
      <div className="note-footer-left">{timestamps}{tagsControl}{iconControls}{kind === "note" && <>{saveStatusView}{saveOptions}</>}<span className="note-footer-path" title={path}>{path || "Markdown"}</span></div>
      {kind === "note" && stats}
    </>}
  </footer>;
}
