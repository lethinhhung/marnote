import { useEffect, useState } from "react";

const storageKey = "marnote-horizontal-scroll";

export function useWideContent() {
  const [horizontalScroll, setHorizontalScroll] = useState(() => localStorage.getItem(storageKey) !== "false");
  useEffect(() => { localStorage.setItem(storageKey, String(horizontalScroll)); }, [horizontalScroll]);
  return { horizontalScroll, toggleHorizontalScroll: () => setHorizontalScroll(value => !value) };
}
