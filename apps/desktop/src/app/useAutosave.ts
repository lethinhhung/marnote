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
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");

  useEffect(() => {
    setStatus("saved");
    if (onStatusChange) onStatusChange("saved");
    saveSequence.current += 1;
  }, [path, onStatusChange]);

  useEffect(() => {
    if (!path || noteContent === undefined) return;
    if (draft === noteContent) return;

    const sequence = ++saveSequence.current;
    const timer = window.setTimeout(() => {
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
    return () => window.clearTimeout(timer);
  }, [draft, path, noteContent, save, onStatusChange]);

  return { status, saveSequence };
}