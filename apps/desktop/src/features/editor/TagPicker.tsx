import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Settings, Tag, X } from "lucide-react";
import { tagEditEventName } from "../../shared/ui/tagEditRequest";

type Props = { selected: string[]; tags: Record<string, string>; onChange: (tags: string[]) => void; onColor: (name: string, color: string) => void; onEdit: (oldName: string, newName: string, color: string) => void };
export function TagPicker({ selected, tags, onChange, onColor, onEdit }: Props) {
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [name, setName] = useState("");
  const [focusedTag, setFocusedTag] = useState("");
  const [editedName, setEditedName] = useState("");
  const [editedColor, setEditedColor] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 12, left: 12 });
  const closeManager = () => { setManage(false); setOpen(false); setFocusedTag(""); };
  const show = () => {
    const rect = root.current?.getBoundingClientRect();
    if (rect) {
      setPosition({ top: rect.top, left: rect.left });
    }
    setOpen(true);
  };
  useLayoutEffect(() => {
    if (!open || manage || !root.current || !popover.current) return;
    const trigger = root.current.getBoundingClientRect();
    const panel = popover.current.getBoundingClientRect();
    const gap = 8;
    const below = window.innerHeight - trigger.bottom - gap;
    const above = trigger.top - gap;
    const top = below >= panel.height || below >= above
      ? Math.min(trigger.bottom + gap, window.innerHeight - panel.height - 12)
      : Math.max(12, trigger.top - panel.height - gap);
    const left = Math.max(12, Math.min(trigger.left, window.innerWidth - panel.width - 12));
    setPosition({ top, left });
  }, [open, manage, Object.keys(tags).length]);
  useEffect(() => {
    if (!open && !manage) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !layer.current?.contains(event.target as Node)) { setOpen(false); setManage(false); }
    };
    const blurOutside = (event: FocusEvent) => {
      if (!root.current?.contains(event.target as Node) && !layer.current?.contains(event.target as Node)) { setOpen(false); setManage(false); }
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeManager(); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", blurOutside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("focusin", blurOutside); document.removeEventListener("keydown", escape); };
  }, [open, manage]);
  useEffect(() => {
    const editTag = (event: Event) => {
      const tag = (event as CustomEvent<string>).detail;
      if (!tag) return;
      setFocusedTag(tag);
      setEditedName(tag);
      setEditedColor(tags[tag] ?? "#74856b");
      setOpen(true);
      setManage(true);
    };
    window.addEventListener(tagEditEventName(), editTag);
    return () => window.removeEventListener(tagEditEventName(), editTag);
  }, [tags]);
  useEffect(() => {
    if (!manage || !focusedTag) return;
    document.querySelector(`[data-managed-tag="${CSS.escape(focusedTag)}"]`)?.scrollIntoView({ block: "center" });
  }, [manage, focusedTag]);
  const toggle = (tag: string) => onChange(selected.includes(tag) ? selected.filter(value => value !== tag) : [...selected, tag]);
  const valueToCreate = () => name.trim().replace(/^#/, "");
  const createSelected = () => { const value = valueToCreate(); if (!value) return; if (!selected.includes(value)) onChange([...selected, value]); setName(""); };
  const createManaged = () => { const value = valueToCreate(); if (!value) return; onColor(value, tags[value] ?? "#74856b"); setName(""); };
  return <div className="tag-picker-wrap" ref={root}>
    <button className={`note-footer-action tag-picker-trigger ${open ? "active" : ""}`} onClick={() => open ? setOpen(false) : show()} aria-label={selected.length ? `Edit tags, ${selected.length} selected` : "Add tag"} aria-expanded={open}><Tag size={12} /><span>Add tag</span></button>
    {(open || manage) && createPortal(<div className="tag-picker-layer" ref={layer} style={{ top: position.top, left: position.left }}>
    {open && !manage && <div className="tag-picker-popover" ref={popover}><div className="tag-picker-heading"><b>Tags</b><button aria-label="Manage tags" onClick={() => { setFocusedTag(""); setManage(true); }}><Settings size={14} /> Advanced</button></div>
      {Object.keys(tags).length ? Object.keys(tags).sort().map(tag => <div className="tag-picker-option" key={tag}><label className="tag-picker-option-select"><input type="checkbox" checked={selected.includes(tag)} onChange={() => toggle(tag)} /><i style={{ background: tags[tag] }} />{tag}</label><input className="tag-picker-color" type="color" aria-label={`Change ${tag} color`} value={tags[tag] || "#74856b"} onChange={event => onColor(tag, event.target.value)} /></div>) : <p className="tag-picker-empty">Create a tag to reuse it on notes and folders.</p>}
      <div className="tag-picker-create"><input value={name} onChange={event => setName(event.target.value)} onKeyDown={event => event.key === "Enter" && createSelected()} placeholder="Create a tag" /><button onClick={createSelected} aria-label="Add tag"><Plus size={13} /></button></div>
    </div>}
    {manage && <div className="tag-manager-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeManager(); }}><section className="tag-manager" role="dialog" aria-modal="true" aria-labelledby="tag-manager-title"><header><div><h2 id="tag-manager-title">{focusedTag ? `Edit #${focusedTag}` : "Manage tags"}</h2><p>{focusedTag ? "Changes apply everywhere this tag is used." : "Shared across notes and folders in this workspace."}</p></div><button aria-label="Close" onClick={closeManager}><X size={17} /></button></header>
      {focusedTag && tags[focusedTag] ? <div className="tag-manager-edit" data-managed-tag={focusedTag}><label>Tag name<input value={editedName} onChange={event => setEditedName(event.target.value)} /></label><label>Color<input type="color" value={editedColor} onChange={event => setEditedColor(event.target.value)} /></label><button disabled={!editedName.trim()} onClick={() => { onEdit(focusedTag, editedName.trim().replace(/^#/, ""), editedColor); setManage(false); setOpen(false); }}>Save changes</button></div> : Object.keys(tags).sort().map(tag => <div className="tag-manager-row" key={tag}><button className="tag-manager-edit-link" onClick={() => { setFocusedTag(tag); setEditedName(tag); setEditedColor(tags[tag]); }}>#{tag}</button><span className="tag-manager-swatch" style={{ background: tags[tag] }} /><input type="color" aria-label={`Change ${tag} color`} value={tags[tag]} onChange={event => onColor(tag, event.target.value)} /><button onClick={() => onColor(tag, "")} aria-label={`Remove ${tag}`}>Remove</button></div>)}
      {!Object.keys(tags).length && <p className="tag-picker-empty">No saved tags yet. Add one below.</p>}
      {!focusedTag && <><div className="tag-manager-create"><input value={name} onChange={event => setName(event.target.value)} onKeyDown={event => event.key === "Enter" && createManaged()} placeholder="New tag name" /><button onClick={createManaged}>Create tag</button></div><footer><button onClick={closeManager}>Done</button></footer></>}</section></div>}
    </div>, document.body)}
  </div>;
}
