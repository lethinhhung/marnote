import { useEffect, useState } from "react";

const KEY = "marnote-explorer-layout";
const DEFAULT_WIDTH = 260;
type Layout = { width: number; collapsed: boolean };

function readLayout(): Layout {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<Layout> | null;
    return { width: typeof value?.width === "number" ? value.width : DEFAULT_WIDTH, collapsed: value?.collapsed === true };
  } catch { return { width: DEFAULT_WIDTH, collapsed: false }; }
}

export function useExplorerLayout() {
  const [layout, setLayout] = useState(readLayout);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(layout)); }, [layout]);
  const resize = (width: number) => setLayout(current => current.width === width ? current : ({ ...current, width }));
  const toggle = () => setLayout(current => ({ ...current, collapsed: !current.collapsed }));
  const collapse = () => setLayout(current => ({ ...current, collapsed: true }));
  return { ...layout, resize, toggle, collapse };
}
