import { promises as fs } from "fs";
import { validateWorkspaceRelativePath, assertWorkspacePath, isMarkdownFile, WorkspaceError } from "./workspace.js";

const MAX_NOTE_BYTES = 64 * 1024;

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

  const handle = await fs.open(canonicalPath, "r");
  try {
    const buffer = Buffer.alloc(MAX_NOTE_BYTES + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const truncated = bytesRead > MAX_NOTE_BYTES;
    const content = buffer.subarray(0, Math.min(bytesRead, MAX_NOTE_BYTES)).toString("utf-8");
    return {
      path: relativePath,
      content: truncated ? `${content}\n\n[Note truncated at 64 KiB]` : content,
    };
  } finally {
    await handle.close();
  }
}
