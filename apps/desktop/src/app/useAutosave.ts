import { useEffect, useRef, useState } from "react";

export interface AutosaveOptions {
  path: string;
  draft: string;
  noteContent: string | undefined;
  save: (path: string, draft: string, originalContent: string) => Promise<boolean>;
  onStatusChange?: (status: "saved" | "saving" | "error") => void;
}

export function useAutosave({
  path,
  draft,
  noteContent,
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
    if (onStatusChange) onStatusChange("saved");
    saveSequence.current += 1;
  }, [path, onStatusChange]);

  useEffect(() => {
    if (!path || noteContent === undefined) return;
    if (draft === noteContent) return;
    if (savingNow.current) return;

    const sequence = ++saveSequence.current;
    const scheduled = window.setTimeout(() => {
      timer.current = null;
      setStatus("saving");
      if (onStatusChange) onStatusChange("saving");
      void save(path, draft, noteContent || "").then((saved) => {
        if (sequence === saveSequence.current) {
          const nextStatus = saved ? "saved" : "error";
          setStatus(nextStatus);
          if (onStatusChange) onStatusChange(nextStatus);
        }
      });
    }, 650);
    timer.current = scheduled;
    return () => window.clearTimeout(scheduled);
  }, [draft, path, noteContent, save, onStatusChange]);

  const saveNow = async () => {
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
  };
  return { status, saveSequence, saveNow };
}
