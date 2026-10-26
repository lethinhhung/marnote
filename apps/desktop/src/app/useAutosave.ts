import { useCallback, useEffect, useRef, useState } from "react";

export interface AutosaveOptions {
  path: string;
  draft: string;
  noteContent: string | undefined;
  enabled?: boolean;
  save: (path: string, draft: string, originalContent: string) => Promise<boolean>;
  onStatusChange?: (status: "saved" | "saving" | "error") => void;
}

export function useAutosave({
  path,
  draft,
  noteContent,
  enabled = true,
  save,
  onStatusChange,
}: AutosaveOptions) {
  const saveSequence = useRef(0);
  const timer = useRef<number | null>(null);
  const savingNow = useRef(false);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const current = useRef({ path, draft, noteContent, save, onStatusChange });
  current.current = { path, draft, noteContent, save, onStatusChange };

  useEffect(() => {
    setStatus("saved");
    current.current.onStatusChange?.("saved");
    saveSequence.current += 1;
  }, [path]);

  useEffect(() => {
    if (!enabled || !path || noteContent === undefined) return;
    if (draft === noteContent) return;
    if (savingNow.current) return;

    const sequence = ++saveSequence.current;
    const scheduled = window.setTimeout(() => {
      timer.current = null;
      setStatus("saving");
      current.current.onStatusChange?.("saving");
      void current.current.save(path, draft, noteContent || "").then((saved) => {
        if (sequence === saveSequence.current) {
          const nextStatus = saved ? "saved" : "error";
          setStatus(nextStatus);
          current.current.onStatusChange?.(nextStatus);
        }
      });
    }, 650);
    timer.current = scheduled;
    return () => window.clearTimeout(scheduled);
  }, [draft, path, noteContent, enabled]);

  const saveNow = useCallback(async () => {
    const value = current.current;
    if (!value.path || value.noteContent === undefined || value.draft === value.noteContent) return true;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    const sequence = ++saveSequence.current;
    setStatus("saving");
    value.onStatusChange?.("saving");
    savingNow.current = true;
    try {
      const saved = await value.save(value.path, value.draft, value.noteContent);
      if (sequence === saveSequence.current) {
        const next = saved ? "saved" : "error";
        setStatus(next);
        value.onStatusChange?.(next);
      }
      return saved;
    } finally {
      savingNow.current = false;
    }
  }, []);
  return { status, saveSequence, saveNow };
}
