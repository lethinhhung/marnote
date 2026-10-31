import { WorkspaceEntry } from "./workspace.js";

export type MatchSource = "Title" | "Path" | "Tag" | "Content";

export interface SearchMatch {
  path: string;
  name: string;
  excerpt: string;
  score: number;
  source: MatchSource;
}

export interface SearchOptions {
  tags?: Map<string, string[]>;
  contents?: Map<string, string>;
  limit?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const SCORE_TITLE = 100;
const SCORE_PATH = 70;
const SCORE_TAG = 50;
const SCORE_CONTENT = 20;

function normalize(text: string): string {
  return text.toLocaleLowerCase();
}

function parseQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalize);
}

function hasWords(value: string, words: string[]): boolean {
  return words.every((word) => value.includes(word));
}

function isMarkdownFile(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}

function makeExcerpt(content: string, query: string): string {
  const body = normalize(content);
  const words = parseQuery(query);
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

function collectMarkdownEntries(
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

function getEntryTags(
  entry: WorkspaceEntry,
  tags: Map<string, string[]> | undefined
): string[] {
  if (!tags) return [];
  return tags.get(entry.path) ?? [];
}

function getEntryContent(
  entry: WorkspaceEntry,
  contents: Map<string, string> | undefined
): string {
  if (!contents) return "";
  return contents.get(entry.path) ?? "";
}

function determineMatchSource(
  title: string,
  path: string,
  tagText: string,
  content: string,
  words: string[]
): MatchSource {
  if (hasWords(title, words)) return "Title";
  if (hasWords(path, words)) return "Path";
  if (hasWords(tagText, words)) return "Tag";
  return "Content";
}

function scoreForSource(source: MatchSource): number {
  switch (source) {
    case "Title":
      return SCORE_TITLE;
    case "Path":
      return SCORE_PATH;
    case "Tag":
      return SCORE_TAG;
    case "Content":
      return SCORE_CONTENT;
  }
}

export function searchWorkspace(
  entries: WorkspaceEntry[],
  query: string,
  options: SearchOptions = {}
): SearchMatch[] {
  const { tags, contents, limit = DEFAULT_LIMIT } = options;
  const words = parseQuery(query);

  if (words.length === 0) return [];

  const clampedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const markdownEntries = collectMarkdownEntries(entries);

  const matches: SearchMatch[] = [];

  for (const entry of markdownEntries) {
    const title = normalize(entry.name.replace(/\.md$/i, ""));
    const path = normalize(entry.path);
    const entryTags = getEntryTags(entry, tags);
    const tagText = normalize(entryTags.join(" "));
    const content = getEntryContent(entry, contents);
    const normalizedContent = normalize(content);

    const searchableText = `${title} ${path} ${tagText} ${normalizedContent}`;
    if (!hasWords(searchableText, words)) continue;

    const source = determineMatchSource(title, path, tagText, normalizedContent, words);
    const score = scoreForSource(source);
    const excerpt = source === "Content" ? makeExcerpt(content, query) : "";

    matches.push({
      path: entry.path,
      name: entry.name,
      excerpt,
      score,
      source,
    });
  }

  matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  return matches.slice(0, clampedLimit);
}