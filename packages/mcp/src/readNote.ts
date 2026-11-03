import { promises as fs } from "fs";
import { validateWorkspaceRelativePath, isMarkdownFile, WorkspaceError } from "./workspace.js";

export interface ReadNoteResult {
  path: string;
  content: string;
}

export async function readNote(root: string, relativePath: string): Promise<ReadNoteResult> {
  const canonicalPath = validateWorkspaceRelativePath(root, relativePath);

  if (!isMarkdownFile(canonicalPath)) {
    throw new WorkspaceError("Expected a Markdown file");
  }

  let stats: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stats = await fs.stat(canonicalPath);
  } catch {
    throw new WorkspaceError("Note not found");
  }

  if (!stats.isFile()) {
    throw new WorkspaceError("Expected a Markdown file");
  }

  const realRoot = await fs.realpath(root);
  const realPath = await fs.realpath(canonicalPath);
  if (!realPath.startsWith(realRoot)) {
    throw new WorkspaceError("Path escapes workspace");
  }

  if (await isSymlink(canonicalPath)) {
    throw new WorkspaceError("Expected a Markdown file");
  }

  const content = await fs.readFile(canonicalPath, "utf-8");
  return { path: relativePath, content };
}

async function isSymlink(path: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(path);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}