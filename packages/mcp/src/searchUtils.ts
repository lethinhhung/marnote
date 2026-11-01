import { WorkspaceEntry } from "./workspace.js";
import { normalize } from "./searchQuery.js";

export function isMarkdownFile(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}

export function collectMarkdownEntries(
  entries: WorkspaceEntry[],
  result: WorkspaceEntry[] = []
): WorkspaceEntry[] {
  for (const entry of entries) {
    if (entry.kind === "file" && isMarkdownFile(entry.name)) {
      result.push(entry);
    } else if (entry.kind === "directory" && entry.children) {
      collectMarkdownEntries(entry.children, result);
    }
  }
  return result;
}

export function getEntryTags(
  entry: WorkspaceEntry,
  tags: Map<string, string[]> | undefined
): string[] {
  if (!tags) return [];
  return tags.get(entry.path) ?? [];
}

export function getEntryContent(
  entry: WorkspaceEntry,
  contents: Map<string, string> | undefined
): string {
  if (!contents) return "";
  return contents.get(entry.path) ?? "";
}

export function makeExcerpt(content: string, query: string): string {
  const body = normalize(content);
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalize);
  const positions = words
    .map((word) => body.indexOf(word))
    .filter((pos) => pos >= 0)
    .sort((a, b) => a - b);

  if (positions.length === 0) return "";

  const index = positions[0];
  const start = Math.max(0, index - 55);
  const end = Math.min(content.length, index + query.length + 85);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  return `${prefix}${content.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}