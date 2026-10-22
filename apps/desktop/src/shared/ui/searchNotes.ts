import type { Entry } from "../domain/workspace";

export type MatchSource = "Title" | "Folder" | "Tag" | "Content";
export type NoteMatch = { entry: Entry; excerpt: string; score: number; source: MatchSource };
export type SearchResults = { notes: NoteMatch[]; folders: Entry[]; tags: { name: string; count: number }[] };
export type SearchFilter = { text: string; tag: string; folder: string; type: string };

export function flattenEntries(entries: Entry[] = []): Entry[] {
  return entries.flatMap(entry => [entry, ...flattenEntries(entry.children)]);
}

export function parseSearchQuery(query: string): SearchFilter {
  const filter: SearchFilter = { text: "", tag: "", folder: "", type: "" };
  const words = query.trim().split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (word.startsWith("#") && word.length > 1) {
      filter.tag = word.slice(1).toLocaleLowerCase();
      continue;
    }
    const match = /^(tag|in|type):(.+)$/i.exec(word);
    if (match) {
      const key = match[1].toLowerCase() === "in" ? "folder" : match[1].toLowerCase();
      filter[key as "tag" | "folder" | "type"] = match[2].replace(/^#/, "").toLocaleLowerCase();
    } else filter.text += `${filter.text ? " " : ""}${word.replace(/^#/, "")}`;
  }
  filter.text = filter.text.toLocaleLowerCase();
  return filter;
}

export function searchNotes(treeEntries: Entry[] | undefined, query: string): Entry[] {
  if (!treeEntries || !query.trim()) return [];
  const needle = query.toLocaleLowerCase();
  return flattenEntries(treeEntries).filter(entry => entry.kind === "file" && entry.path.toLowerCase().endsWith(".md") && (entry.name + " " + entry.path).toLocaleLowerCase().includes(needle)).slice(0, 8);
}

function makeExcerpt(content: string, query: string): string {
  const body = content.toLocaleLowerCase();
  const index = query.split(/\s+/).map(word => body.indexOf(word)).filter(position => position >= 0).sort((a, b) => a - b)[0] ?? -1;
  if (index < 0) return "";
  const start = Math.max(0, index - 55);
  const end = Math.min(content.length, index + query.length + 85);
  return `${start ? "…" : ""}${content.slice(start, end).replace(/\s+/g, " ").trim()}${end < content.length ? "…" : ""}`;
}

const isMarkdown = (entry: Entry) => entry.kind === "file" && entry.path.toLocaleLowerCase().endsWith(".md");
const hasWords = (value: string, words: string[]) => words.every(word => value.includes(word));

export function searchWorkspace(entries: Entry[] = [], query: string, contents: Record<string, string> = {}): SearchResults {
  if (!query.trim()) return { notes: [], folders: [], tags: [] };
  const filter = parseSearchQuery(query);
  const all = flattenEntries(entries);
  const words = filter.text.split(/\s+/).filter(Boolean);
  const folderMatches = (path: string) => !filter.folder || path.toLocaleLowerCase().includes(filter.folder);
  const notes = all.filter(isMarkdown).filter(entry => folderMatches(entry.path) && (!filter.type || filter.type === "note"))
    .map(entry => makeNoteMatch(entry, words, filter, contents[entry.path] ?? ""))
    .filter((match): match is NoteMatch => !!match)
    .sort((a, b) => b.score - a.score || (b.entry.modifiedMs ?? 0) - (a.entry.modifiedMs ?? 0));
  const folders = all.filter(entry => entry.kind === "directory" && (!filter.type || filter.type === "folder") && folderMatches(entry.path))
    .filter(entry => !words.length || hasWords(`${entry.name} ${entry.path}`.toLocaleLowerCase(), words));
  const tags = collectTags(all, filter, words);
  return { notes, folders, tags };
}

function makeNoteMatch(entry: Entry, words: string[], filter: SearchFilter, content: string): NoteMatch | null {
  const title = entry.name.replace(/\.md$/i, "").toLocaleLowerCase();
  const path = entry.path.toLocaleLowerCase();
  const tagNames = entry.metadata?.tags ?? [];
  const tagText = tagNames.join(" ").toLocaleLowerCase();
  if (filter.tag && !tagNames.some(tag => tag.toLocaleLowerCase() === filter.tag)) return null;
  const source: MatchSource = hasWords(title, words) ? "Title" : hasWords(path, words) ? "Folder" : hasWords(tagText, words) ? "Tag" : "Content";
  if (!hasWords(`${title} ${path} ${tagText} ${content}`.toLocaleLowerCase(), words)) return null;
  const score = source === "Title" ? 100 : source === "Folder" ? 70 : source === "Tag" ? 50 : 20;
  return { entry, excerpt: makeExcerpt(content, filter.text), score, source };
}

function collectTags(entries: Entry[], filter: SearchFilter, words: string[]) {
  const counts = new Map<string, number>();
  for (const entry of entries.filter(isMarkdown)) {
    if (!folderFilter(entry.path, filter.folder) || (filter.type && filter.type !== "note")) continue;
    for (const tag of new Set(entry.metadata?.tags ?? [])) {
      const tagName = tag.toLocaleLowerCase();
      if (filter.tag ? tagName === filter.tag : tagName.includes(words.join(" "))) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

const folderFilter = (path: string, folder: string) => !folder || path.toLocaleLowerCase().includes(folder);
