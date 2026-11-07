import type { Entry, WorkspaceTree } from "../domain/workspace";
import type { SearchFilter, SearchResults } from "./searchNotes";
import type { CopyNoteValue } from "./searchActions";

export type Choice = {
  id: string;
  label: string;
  run: () => void;
  type: "note" | "folder" | "command" | "tag" | "create";
  entry?: Entry;
  subtitle?: string;
  excerpt?: string;
  source?: string;
  count?: number;
};

const commands = ["Quick Capture new note…", "Copy internal link to note", "Copy relative path", "Copy full path"];

export function buildSearchChoices({
  matches,
  trimmed,
  createTitle,
  parsedQuery,
  tree,
  currentPath,
  onSelect,
  onCreate,
  onCapture,
  onCopy,
  onTagSelect,
}: {
  matches: SearchResults;
  trimmed: string;
  createTitle: string;
  parsedQuery: SearchFilter;
  tree: WorkspaceTree | null;
  currentPath: string;
  onSelect: (entry: Entry) => void;
  onCreate: (title: string) => void;
  onCapture: () => void;
  onCopy: (value: CopyNoteValue) => void;
  onTagSelect: (name: string) => void;
}): Choice[] {
  const result: Choice[] = [];
  for (const item of matches.notes.slice(0, 6))
    result.push({
      id: item.entry.path,
      label: item.entry.name,
      subtitle: item.entry.path,
      excerpt: item.excerpt,
      source: item.source,
      type: "note",
      entry: item.entry,
      run: () => onSelect(item.entry),
    });
  for (const entry of matches.folders.slice(0, 3))
    result.push({ id: entry.path, label: entry.name, subtitle: entry.path, type: "folder", entry, run: () => onSelect(entry) });
  for (const command of commands.filter(
    (label) => (label.startsWith("Quick") ? !!tree : !!currentPath) && (!trimmed || label.toLocaleLowerCase().includes(trimmed.toLocaleLowerCase())),
  ))
    result.push({
      id: command,
      label: command,
      type: "command",
      run: command.startsWith("Quick") ? onCapture : () => onCopy(command.includes("internal link") ? "link" : command.includes("relative") ? "relative-path" : "full-path"),
    });
  for (const tag of matches.tags.slice(0, 6))
    result.push({ id: `tag:${tag.name}`, label: `#${tag.name}`, count: tag.count, type: "tag", run: () => onTagSelect(tag.name) });
  if (
    tree &&
    createTitle &&
    !parsedQuery.tag &&
    !parsedQuery.folder &&
    !parsedQuery.type &&
    !createTitle.includes("/") &&
    !createTitle.includes("\\") &&
    createTitle.length < 100 &&
    !matches.notes.some((item) => item.entry.name.replace(/\.md$/i, "").toLocaleLowerCase() === createTitle.toLocaleLowerCase())
  )
    result.push({ id: "create", label: `Create new note "${createTitle}"`, type: "create", run: () => onCreate(createTitle) });
  return result;
}
