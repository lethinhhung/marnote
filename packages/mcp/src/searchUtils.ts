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
  if (words.length === 0) {
    const trimmed = content.replace(/\s+/g, " ").trim();
    return trimmed.slice(0, 140) + (trimmed.length > 140 ? "…" : "");
  }
  const matches = words.map(word => ({ word, index: body.indexOf(word) })).filter(m => m.index >= 0);
  if (matches.length === 0) return "";
  matches.sort((a, b) => a.index - b.index);
  const first = matches[0];
  const last = matches[matches.length - 1];
  const start = Math.max(0, first.index - 55);
  const end = Math.min(content.length, last.index + last.word.length + 85);
  return `${start ? "…" : ""}${content.slice(start, end).replace(/\s+/g, " ").trim()}${end < content.length ? "…" : ""}`;
}