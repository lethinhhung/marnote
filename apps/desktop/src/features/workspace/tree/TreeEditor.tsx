import { useRef } from "react";
import { FileText, Folder, X } from "lucide-react";

type Props = { kind: "note" | "folder"; value: string; depth: number; onSubmit: (name: string) => void; onCancel: () => void };

export function TreeEditor({ kind, value, depth, onSubmit, onCancel }: Props) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="tree-edit-row" style={{ paddingLeft: 5 + depth * 14 }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onCancel(); }}>
    {kind === "folder" ? <Folder size={15} /> : <FileText size={15} />}
    <form onSubmit={event => { event.preventDefault(); const name = input.current?.value.trim(); if (name) onSubmit(name); }}>
      <input ref={input} autoFocus aria-label={kind === "note" ? "Note name" : "Folder name"} defaultValue={value} onKeyDown={event => { if (event.key === "Escape") onCancel(); }} />
    </form>
    <button type="button" aria-label="Cancel" onClick={onCancel}><X size={13} /></button>
  </div>;
}
