import { WorkspaceEntry } from "./workspace.js";
import { normalize } from "./searchQuery.js";
import {
  collectMarkdownEntries,
  getEntryTags,
  getEntryContent,
} from "./searchUtils.js";

export interface SearchableEntry {
  entry: WorkspaceEntry;
  title: string;
  path: string;
  tagText: string;
  content: string;
  normalizedContent: string;
  searchableText: string;
}

export function collectSearchableEntries(
  entries: WorkspaceEntry[],
  tags: Map<string, string[]> | undefined,
  contents: Map<string, string> | undefined
): SearchableEntry[] {
  const markdownEntries = collectMarkdownEntries(entries);
  const result: SearchableEntry[] = [];

  for (const entry of markdownEntries) {
    const title = normalize(entry.name.replace(/\.md$/i, ""));
    const path = normalize(entry.path);
    const entryTags = getEntryTags(entry, tags);
    const tagText = normalize(entryTags.join(" "));
    const content = getEntryContent(entry, contents);
    const normalizedContent = normalize(content);
    const searchableText = `${title} ${path} ${tagText} ${normalizedContent}`;

    result.push({
      entry,
      title,
      path,
      tagText,
      content,
      normalizedContent,
      searchableText,
    });
  }

  return result;
}