import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export function useTreeFolderFocus(setExpanded: Dispatch<SetStateAction<Set<string>>>) {
  const [focusPath, setFocusPath] = useState("");

  useEffect(() => {
    const navigate = (event: Event) => {
      const path = (event as CustomEvent<string>).detail;
      if (typeof path !== "string" || !path) return;
      const parts = path.split("/").filter(Boolean);
      setExpanded(current => {
        const next = new Set(current);
        parts.slice(0, -1).forEach((_, index) => next.add(parts.slice(0, index + 1).join("/")));
        return next;
      });
      setFocusPath("");
      window.requestAnimationFrame(() => setFocusPath(path));
    };
    const clear = () => setFocusPath("");
    document.addEventListener("marnote-navigate-folder", navigate);
    document.addEventListener("marnote-clear-folder-focus", clear);
    return () => { document.removeEventListener("marnote-navigate-folder", navigate); document.removeEventListener("marnote-clear-folder-focus", clear); };
  }, [setExpanded]);

  useEffect(() => {
    if (!focusPath) return;
    const row = [...document.querySelectorAll<HTMLButtonElement>(".tree-item")].find(item => item.dataset.path === focusPath);
    row?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const timeout = window.setTimeout(() => setFocusPath(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [focusPath]);

  return focusPath;
}
