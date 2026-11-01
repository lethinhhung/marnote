import { WorkspaceEntry } from "./workspace.js";
import type { MatchSource, SearchMatch, SearchOptions } from "./searchTypes.js";
import { normalize, parseQuery, hasWords } from "./searchQuery.js";
import { collectSearchableEntries } from "./searchEntries.js";
import { makeExcerpt } from "./searchUtils.js";

export type { MatchSource, SearchMatch, SearchOptions };
export { normalize, parseQuery, hasWords };

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const SCORE_TITLE = 100;
const SCORE_PATH = 70;
const SCORE_TAG = 50;
const SCORE_CONTENT = 20;

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
  const searchableEntries = collectSearchableEntries(entries, tags, contents);

  const matches: SearchMatch[] = [];

  for (const se of searchableEntries) {
    if (!hasWords(se.searchableText, words)) continue;

    const source = determineMatchSource(se.title, se.path, se.tagText, se.normalizedContent, words);
    const score = scoreForSource(source);
    const excerpt = source === "Content" ? makeExcerpt(se.content, query) : "";

    matches.push({
      path: se.entry.path,
      name: se.entry.name,
      excerpt,
      score,
      source,
    });
  }

  matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  return matches.slice(0, clampedLimit);
}