import { promises as fs } from "fs";
import { resolve } from "path";
import { collectWorkspaceEntries, ResolvedWorkspace, WorkspaceEntry } from "./workspace.js";
import { searchWorkspace, SearchMatch } from "./searchMatching.js";

export interface SearchNotesResult {
  results: SearchMatch[];
  total: number;
}

interface WorkspaceMetadata {
  entries: Record<string, { tags?: string[] }>;
}

async function readWorkspaceMetadata(root: string): Promise<WorkspaceMetadata | null> {
  const metadataPath = resolve(root, ".marnote", "metadata.json");
  try {
    const content = await fs.readFile(metadataPath, "utf-8");
    if (!content.trim()) return null;
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function readMarkdownContents(
  entries: WorkspaceEntry[],
  root: string
): Promise<Map<string, string>> {
  const contents = new Map<string, string>();

  async function readRecursive(entries: WorkspaceEntry[]): Promise<void> {
    for (const entry of entries) {
      if (entry.kind === "file") {
        const fullPath = resolve(root, entry.path);
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          contents.set(entry.path, content);
        } catch {
          // Skip unreadable files
        }
      } else if (entry.kind === "directory" && entry.children) {
        await readRecursive(entry.children);
      }
    }
  }

  await readRecursive(entries);
  return contents;
}

function extractTags(metadata: WorkspaceMetadata | null): Map<string, string[]> {
  const tags = new Map<string, string[]>();
  if (!metadata?.entries) return tags;

  for (const [path, entryMeta] of Object.entries(metadata.entries)) {
    if (entryMeta.tags?.length) {
      tags.set(path, entryMeta.tags);
    }
  }
  return tags;
}

export async function searchNotes(
  workspace: ResolvedWorkspace,
  query: string,
  limit?: number
): Promise<SearchNotesResult> {
  const entries = await collectWorkspaceEntries(workspace.root, workspace.root);
  const metadata = await readWorkspaceMetadata(workspace.root);
  const tags = extractTags(metadata);
  const contents = await readMarkdownContents(entries, workspace.root);

  const matches = searchWorkspace(entries, query, {
    tags,
    contents,
    limit,
  });

  return {
    results: matches,
    total: matches.length,
  };
}