import { useEffect, useRef, useState } from "react";

type Action = "save" | "discard";
type Props = { noteNames: string[]; onAction: (name: string, action: Action) => Promise<boolean>; onComplete: () => void; onCancel: () => void };

export function UnsavedChangesDialog({ noteNames, onAction, onComplete, onCancel }: Props) {
  const save = useRef<HTMLButtonElement>(null);
  const [remaining, setRemaining] = useState(noteNames);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { save.current?.focus(); }, []);
  const chooseOne = async (name: string, action: Action) => {
    setBusy(true); setError("");
    if (!await onAction(name, action)) { setError(`Could not save “${name}”. It remains in the list.`); setBusy(false); return; }
    const next = remaining.filter(item => item !== name);
    setRemaining(next); setBusy(false);
    if (!next.length) onComplete();
  };
  const chooseAll = async (action: Action) => {
    setBusy(true); setError("");
    let pending = [...remaining];
    for (const name of remaining) {
      if (!await onAction(name, action)) { setError(`Could not save “${name}”. It remains in the list.`); break; }
      pending = pending.filter(item => item !== name);
      setRemaining(pending);
    }
    setBusy(false);
    if (!pending.length) onComplete();
  };
  return <div className="move-dialog-backdrop unsaved-backdrop" role="presentation">
    <section className="move-dialog unsaved-dialog" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title" aria-describedby="unsaved-description" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onCancel(); } }}>
      <h2 id="unsaved-title">Unsaved drafts</h2>
      <p id="unsaved-description">Choose what to do with each unsaved note before continuing:</p>
      <ul className="unsaved-note-list">{remaining.map(name => <li key={name}><span>{name}</span><span className="unsaved-note-actions"><button type="button" disabled={busy} onClick={() => void chooseOne(name, "discard")}>Discard</button><button type="button" disabled={busy} onClick={() => void chooseOne(name, "save")}>Save</button></span></li>)}</ul>
      {error && <p className="unsaved-error" role="alert">{error}</p>}
      <footer><button type="button" disabled={busy} onClick={onCancel}>Cancel</button><span className="unsaved-footer-actions"><button type="button" disabled={busy} onClick={() => void chooseAll("discard")}>Discard all</button><button ref={save} type="button" disabled={busy} onClick={() => void chooseAll("save")}>Save all</button></span></footer>
    </section>
  </div>;
}
