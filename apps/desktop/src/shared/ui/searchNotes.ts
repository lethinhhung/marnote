import type { Entry } from "../domain/workspace";

function collectMarkdownFiles(entries: Entry[]): Entry[] {
  return entries.flatMap((entry) =>
    entry.kind === "directory"
      ? collectMarkdownFiles(entry.children || [])
      : entry.path.toLowerCase().endsWith(".md")
      ? [entry]
      : []
  );
}

export function searchNotes(treeEntries: Entry[] | undefined, query: string): Entry[] {
  if (!treeEntries || !query.trim()) return [];
  const markdownFiles = collectMarkdownFiles(treeEntries);
  const lowerQuery = query.toLowerCase();
  return markdownFiles
    .filter((file) => (file.name + " " + file.path).toLowerCase().includes(lowerQuery))
    .slice(0, 8);
}