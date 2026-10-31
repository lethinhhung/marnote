import { promises as fs } from "fs";
import { resolve, isAbsolute } from "path";
import { WorkspaceError } from "./workspaceErrors.js";

export function validateWorkspaceRelativePath(root: string, relativePath: string): string {
  if (!relativePath || relativePath.trim() === "") {
    throw new WorkspaceError("Path must be a non-empty workspace-relative path");
  }
  if (isAbsolute(relativePath) || /^[A-Za-z]:[\\/]/.test(relativePath)) {
    throw new WorkspaceError("Path must be workspace-relative, not absolute");
  }

  const normalized = relativePath.replace(/\\/g, "/");
  for (const part of normalized.split("/")) {
    if (part === "" || part === "." || part === "..") {
      throw new WorkspaceError("Path must not contain empty segments, '.', or '..'");
    }
  }

  const canonicalRoot = resolve(root);
  const canonicalResolved = resolve(root, normalized);
  if (!canonicalResolved.startsWith(canonicalRoot)) throw new WorkspaceError("Path escapes workspace");
  return canonicalResolved;
}

export async function isSymlink(path: string): Promise<boolean> {
  try {
    return (await fs.lstat(path)).isSymbolicLink();
  } catch {
    return false;
  }
}

export function isMarkdownFile(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}
