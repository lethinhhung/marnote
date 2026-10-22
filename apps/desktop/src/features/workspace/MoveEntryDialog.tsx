import { useMemo, useState, type KeyboardEvent } from "react";
import { FolderInput } from "lucide-react";
import type { Entry } from "./workspaceTypes";

type Props = { entries: Entry[]; path: string; folder: boolean; onMove: (source: string, destination: string) => Promise<boolean>; onClose: () => void };

function folders(entries: Entry[], excluded: string, result: Array<{ path: string; name: string }> = []) {
  entries.forEach(entry => {
    if (entry.kind !== "directory" || entry.path === excluded || entry.path.startsWith(`${excluded}/`)) return;
    result.push({ path: entry.path, name: entry.path });
    folders(entry.children ?? [], excluded, result);
  });
  return result;
}

export function MoveEntryDialog({ entries, path, folder, onMove, onClose }: Props) {
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const name = path.split("/").pop() || path;
  const options = useMemo(() => folders(entries, folder ? path : ""), [entries, folder, path]);
  const next = [destination, name].filter(Boolean).join("/");
  const submit = async () => { if (busy || next === path) return; setBusy(true); if (await onMove(path, next)) onClose(); else setBusy(false); };
  const dialogKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), select")];
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
    if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
  };
  return <div className="move-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="move-dialog" role="dialog" aria-modal="true" aria-labelledby="move-dialog-title" onKeyDown={dialogKeys}>
      <h2 id="move-dialog-title"><FolderInput size={18} /> Move {folder ? "folder" : "note"}</h2>
      <p>{name}</p>
      <label>Destination folder<select autoFocus value={destination} onChange={event => setDestination(event.target.value)}><option value="">Workspace root</option>{options.map(item => <option key={item.path} value={item.path}>{item.name}</option>)}</select></label>
      <footer><button type="button" onClick={onClose}>Cancel</button><button type="button" disabled={busy || next === path} onClick={() => void submit()}>{busy ? "Moving…" : "Move"}</button></footer>
    </section>
  </div>;
}
