import { promises as fs } from "fs";
import { relative, resolve, isAbsolute, sep } from "path";
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
  if (!isWithin(canonicalRoot, canonicalResolved)) throw new WorkspaceError("Path escapes workspace");
  return canonicalResolved;
}

export async function assertWorkspacePath(root: string, target: string): Promise<void> {
  const canonicalRoot = await fs.realpath(root);
  const segments = relative(canonicalRoot, target).split(sep).filter(Boolean);
  let current = canonicalRoot;

  for (const segment of segments) {
    current = resolve(current, segment);
    const stats = await fs.lstat(current);
    if (stats.isSymbolicLink()) throw new WorkspaceError("Path must not contain symlinks");
  }

  const realTarget = await fs.realpath(target);
  if (!isWithin(canonicalRoot, realTarget)) throw new WorkspaceError("Path escapes workspace");
}

function isWithin(root: string, target: string): boolean {
  const pathFromRoot = relative(root, target);
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== "..");
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
