import { promises as fs } from "fs";
import { resolve, isAbsolute } from "path";

export interface WorkspaceConfig {
  path: string;
}

export interface ResolvedWorkspace {
  root: string;
  name: string;
}

export class WorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export function diagnose(message: string): void {
  console.error(`[mcp] ${message}`);
}

export async function resolveWorkspace(config: WorkspaceConfig): Promise<ResolvedWorkspace> {
  const { path: workspacePath } = config;

  if (!workspacePath || workspacePath.trim() === "") {
    diagnose("Workspace path is empty");
    throw new WorkspaceError("Workspace path is required");
  }

  let absolutePath: string;
  try {
    absolutePath = isAbsolute(workspacePath)
      ? workspacePath
      : resolve(process.cwd(), workspacePath);
  } catch {
    diagnose(`Invalid workspace path: ${workspacePath}`);
    throw new WorkspaceError(`Invalid workspace path: ${workspacePath}`);
  }

  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isDirectory()) {
      diagnose(`Workspace path is not a directory: ${absolutePath}`);
      throw new WorkspaceError("Workspace must be a directory");
    }
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    diagnose(`Workspace does not exist: ${absolutePath}`);
    throw new WorkspaceError("Workspace does not exist");
  }

  const canonicalPath = await fs.realpath(absolutePath);
  const name = canonicalPath.split("/").pop() || "workspace";

  return { root: canonicalPath, name };
}

export function validateWorkspaceRelativePath(root: string, relativePath: string): string {
  if (!relativePath || relativePath.trim() === "") {
    throw new WorkspaceError("Path must be a non-empty workspace-relative path");
  }

  if (isAbsolute(relativePath)) {
    throw new WorkspaceError("Path must be workspace-relative, not absolute");
  }

  // Check for Windows-style absolute paths (e.g., C:\path, C:/path)
  if (/^[A-Za-z]:[\\/]/.test(relativePath)) {
    throw new WorkspaceError("Path must be workspace-relative, not absolute");
  }

  const normalized = relativePath.replace(/\\/g, "/");
  const parts = normalized.split("/");

  for (const part of parts) {
    if (part === "" || part === "." || part === "..") {
      throw new WorkspaceError("Path must not contain empty segments, '.', or '..'");
    }
  }

  const resolved = resolve(root, normalized);
  const canonicalRoot = resolve(root);
  const canonicalResolved = resolve(resolved);

  if (!canonicalResolved.startsWith(canonicalRoot)) {
    throw new WorkspaceError("Path escapes workspace");
  }

  return canonicalResolved;
}

export async function isSymlink(path: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(path);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

export function isMarkdownFile(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}

export interface WorkspaceEntry {
  name: string;
  path: string;
  kind: "file" | "directory";
  children?: WorkspaceEntry[];
}

const EXCLUDED_NAMES = new Set([".marnote-trash", ".marnote"]);

export async function collectWorkspaceEntries(
  dir: string,
  base: string
): Promise<WorkspaceEntry[]> {
  const entries: WorkspaceEntry[] = [];

  try {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      if (item.isSymbolicLink()) continue;
      if (EXCLUDED_NAMES.has(item.name)) continue;

      const fullPath = resolve(dir, item.name);
      const relativePath = fullPath
        .replace(base, "")
        .replace(/^\/+/, "")
        .replace(/\\/g, "/");

      const isMarkdown = await isMarkdownFile(fullPath);
      const isDirectory = item.isDirectory();

      if (isDirectory || isMarkdown) {
        const children = isDirectory
          ? await collectWorkspaceEntries(fullPath, base)
          : undefined;

        entries.push({
          name: item.name,
          path: relativePath,
          kind: isDirectory ? "directory" : "file",
          children,
        });
      }
    }
  } catch {
    // Directory might not be readable, return empty
  }

  entries.sort((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();
    if (aLower < bLower) return -1;
    if (aLower > bLower) return 1;
    return 0;
  });
  return entries;
}