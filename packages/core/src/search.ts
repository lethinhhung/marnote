import { flattenEntries, isMarkdown, type Entry } from "./workspace.js";
import { parseSearchQuery, hasWords, folderMatches, type MatchSource, type SearchFilter } from "./searchQuery.js";
import { makeExcerpt } from "./searchUtils.js";

export type NoteMatch = { entry: Entry; excerpt: string; score: number; source: MatchSource };
export type SearchResults = { notes: NoteMatch[]; folders: Entry[]; tags: { name: string; count: number }[] };
export { type MatchSource, type SearchFilter, parseSearchQuery };

export function searchWorkspace(entries: Entry[] = [], query: string, contents: Record<string, string> = {}): SearchResults {
  if (!query.trim()) return { notes: [], folders: [], tags: [] };
  const filter = parseSearchQuery(query);
  const all = flattenEntries(entries);
  const words = filter.text.split(/\s+/).filter(Boolean);
  const matchedEntries = all.filter(isMarkdown).filter(entry => folderMatches(entry.path, filter.folder) && (!filter.type || filter.type === "note"));
  const notes = matchedEntries
    .map(entry => makeNoteMatch(entry, words, filter, contents[entry.path] ?? ""))
    .filter((match): match is NoteMatch => !!match)
    .sort((a, b) => b.score - a.score || (b.entry.modifiedMs ?? 0) - (a.entry.modifiedMs ?? 0));
  const folders = all.filter(entry => entry.kind === "directory" && (!filter.type || filter.type === "folder") && folderMatches(entry.path, filter.folder))
    .filter(entry => !words.length || hasWords(`${entry.name} ${entry.path}`.toLocaleLowerCase(), words));
  const tags = collectTags(notes.map(n => n.entry), filter, words);
  return { notes, folders, tags };
}

export function excerptQueryFor(filter: SearchFilter, source: string | undefined): string {
  if (filter.text) return filter.text;
  if (source === "Tag" && filter.tag) return filter.tag;
  if (source === "Folder" && filter.folder) return filter.folder;
  return "";
}

function makeNoteMatch(entry: Entry, words: string[], filter: SearchFilter, content: string): NoteMatch | null {
  const title = entry.name.replace(/\.md$/i, "").toLocaleLowerCase();
  const path = entry.path.toLocaleLowerCase();
  const tagNames = entry.metadata?.tags ?? [];
  const tagText = tagNames.join(" ").toLocaleLowerCase();
  if (filter.tag && !tagNames.some(tag => tag.toLocaleLowerCase() === filter.tag)) return null;
  const source: MatchSource = words.length
    ? hasWords(title, words) ? "Title" : hasWords(path, words) ? "Folder" : hasWords(tagText, words) ? "Tag" : "Content"
    : filter.tag ? "Tag" : filter.folder ? "Folder" : "Content";
  const combinedLower = `${title} ${path} ${tagText} ${content}`.toLocaleLowerCase();
  if (words.length && !hasWords(combinedLower, words)) return null;
  const score = source === "Title" ? 100 : source === "Folder" ? 70 : source === "Tag" ? 50 : 20;
  const titleText = entry.name.replace(/\.md$/i, "");
  const pathText = entry.path;
  const tagTextOriginal = tagNames.join(" ");
  const combinedText = `${titleText} ${pathText} ${tagTextOriginal} ${content}`;
  const sourceText = source === "Title" ? titleText : source === "Folder" ? pathText : source === "Tag" ? tagTextOriginal : combinedText;
  const excerptQuery = excerptQueryFor(filter, source);
  return { entry, excerpt: makeExcerpt(sourceText, excerptQuery), score, source };
}

function collectTags(entries: Entry[], filter: SearchFilter, words: string[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of new Set(entry.metadata?.tags ?? [])) {
      const tagName = tag.toLocaleLowerCase();
      if (filter.tag ? tagName === filter.tag : words.some(word => tagName.includes(word))) counts.set(tagName, (counts.get(tagName) ?? 0) + 1);
    }
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}