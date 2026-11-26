import { promises as fs } from "fs";
import { validateWorkspaceRelativePath, assertWorkspacePath, isMarkdownFile, WorkspaceError } from "./workspace.js";

export interface ReadNoteResult {
  path: string;
  content: string;
}

export async function readNote(root: string, relativePath: string): Promise<ReadNoteResult> {
  const canonicalPath = validateWorkspaceRelativePath(root, relativePath);

  if (!isMarkdownFile(canonicalPath)) {
    throw new WorkspaceError("Expected a Markdown file");
  }

  try {
    await assertWorkspacePath(root, canonicalPath);
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    throw new WorkspaceError("Note not found");
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

  const content = await fs.readFile(canonicalPath, "utf-8");
  return { path: relativePath, content };
}
