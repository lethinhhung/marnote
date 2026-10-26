import { useEffect, useState } from "react";

export type SaveMode = "automatic" | "manual";
const key = "marnote-save-mode";

function loadMode(): SaveMode {
  return localStorage.getItem(key) === "manual" ? "manual" : "automatic";
}

export function useSaveMode() {
  const [mode, setMode] = useState<SaveMode>(loadMode);
  useEffect(() => { localStorage.setItem(key, mode); }, [mode]);
  return { mode, setMode };
}
