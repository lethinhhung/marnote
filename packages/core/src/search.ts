import { flattenEntries, isMarkdown, type Entry } from "./workspace.js";

export type MatchSource = "Title" | "Folder" | "Tag" | "Content";
export type NoteMatch = { entry: Entry; excerpt: string; score: number; source: MatchSource };
export type SearchResults = { notes: NoteMatch[]; folders: Entry[]; tags: { name: string; count: number }[] };
export type SearchFilter = { text: string; tag: string; folder: string; type: string };

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

function makeExcerpt(sourceText: string, query: string): string {
  const body = sourceText.toLocaleLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  if (!words.length) {
    const trimmed = sourceText.replace(/\s+/g, " ").trim();
    return trimmed.slice(0, 140) + (trimmed.length > 140 ? "…" : "");
  }
  const matches = words.map(word => ({ word, index: body.indexOf(word) })).filter(m => m.index >= 0);
  if (!matches.length) return "";
  matches.sort((a, b) => a.index - b.index);
  const first = matches[0];
  const last = matches[matches.length - 1];
  const start = Math.max(0, first.index - 55);
  const end = Math.min(sourceText.length, last.index + last.word.length + 85);
  return `${start ? "…" : ""}${sourceText.slice(start, end).replace(/\s+/g, " ").trim()}${end < sourceText.length ? "…" : ""}`;
}

const hasWords = (value: string, words: string[]) => words.every(word => value.includes(word));
const folderMatches = (path: string, folder: string) => {
  if (!folder) return true;
  const lowerFolder = folder.toLocaleLowerCase();
  return path.toLocaleLowerCase().split("/").some(segment => segment === lowerFolder);
};

export function searchWorkspace(entries: Entry[] = [], query: string, contents: Record<string, string> = {}): SearchResults {
  if (!query.trim()) return { notes: [], folders: [], tags: [] };
  const filter = parseSearchQuery(query);
  const all = flattenEntries(entries);
  const words = filter.text.split(/\s+/).filter(Boolean);
  const notes = all.filter(isMarkdown).filter(entry => folderMatches(entry.path, filter.folder) && (!filter.type || filter.type === "note"))
    .map(entry => makeNoteMatch(entry, words, filter, contents[entry.path] ?? ""))
    .filter((match): match is NoteMatch => !!match)
    .sort((a, b) => b.score - a.score || (b.entry.modifiedMs ?? 0) - (a.entry.modifiedMs ?? 0));
  const folders = all.filter(entry => entry.kind === "directory" && (!filter.type || filter.type === "folder") && folderMatches(entry.path, filter.folder))
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
  let excerptQuery = filter.text;
  if (!excerptQuery) {
    if (source === "Tag" && filter.tag) excerptQuery = filter.tag;
    else if (source === "Folder" && filter.folder) excerptQuery = filter.folder;
  }
  return { entry, excerpt: makeExcerpt(sourceText, excerptQuery), score, source };
}

function collectTags(entries: Entry[], filter: SearchFilter, words: string[]) {
  const counts = new Map<string, number>();
  for (const entry of entries.filter(isMarkdown)) {
    if (!folderMatches(entry.path, filter.folder) || (filter.type && filter.type !== "note")) continue;
    for (const tag of new Set(entry.metadata?.tags ?? [])) {
      const tagName = tag.toLocaleLowerCase();
      if (filter.tag ? tagName === filter.tag : words.some(word => tagName.includes(word))) counts.set(tagName, (counts.get(tagName) ?? 0) + 1);
    }
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}