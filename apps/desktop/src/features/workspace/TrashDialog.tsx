import { useEffect, type KeyboardEvent } from "react";
import { RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import type { TrashItem } from "../../platform/workspace";

type Props = { items: TrashItem[]; load: () => void; restore: (id: string) => void; empty: () => void; close: () => void };

export function TrashDialog({ items, load, restore, empty, close }: Props) {
  useEffect(() => { load(); }, [load]);
  const emptyConfirmed = () => {
    if (items.length && window.confirm("Permanently delete all items in this workspace's trash? This cannot be undone.")) empty();
  };
  const dialogKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled)")];
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
    if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
  };
  return <div className="move-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section className="trash-dialog" role="dialog" aria-modal="true" aria-labelledby="trash-title" onKeyDown={dialogKeys}>
      <header><h2 id="trash-title">Workspace trash</h2><button autoFocus aria-label="Close trash" onClick={close}><X size={16} /></button></header>
      <div className="trash-list">{items.length ? items.map(item => <div className="trash-row" key={item.id}><span title={item.path}>{item.path}</span>{item.restorable && <button onClick={() => restore(item.id)} aria-label={`Restore ${item.path}`}><RotateCcw size={14} />Restore</button>}</div>) : <p>Trash is empty.</p>}</div>
      <footer><button onClick={load}><RefreshCw size={14} />Refresh</button><button className="danger" disabled={!items.length} onClick={emptyConfirmed}><Trash2 size={14} />Empty trash</button></footer>
    </section>
  </div>;
}
