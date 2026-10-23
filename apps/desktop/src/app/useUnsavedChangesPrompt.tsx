import { useCallback, useState } from "react";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

type Action = "save" | "discard";
type Pending = { noteNames: string[]; onAction: (name: string, action: Action) => Promise<boolean>; resolve: (accepted: boolean) => void };

export function useUnsavedChangesPrompt() {
  const [pending, setPending] = useState<Pending | null>(null);
  const ask = useCallback((noteNames: string[], onAction: Pending["onAction"]) => new Promise<boolean>(resolve => setPending({ noteNames, onAction, resolve })), []);
  const finish = (accepted: boolean) => { pending?.resolve(accepted); setPending(null); };
  const dialog = pending && <UnsavedChangesDialog noteNames={pending.noteNames} onAction={pending.onAction} onComplete={() => finish(true)} onCancel={() => finish(false)} />;
  return { ask, dialog };
}
