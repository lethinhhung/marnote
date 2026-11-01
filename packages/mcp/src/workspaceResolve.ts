import { promises as fs } from "fs";
import { resolve, isAbsolute } from "path";
import { diagnose, WorkspaceError } from "./workspaceErrors.js";
import type { ResolvedWorkspace, WorkspaceConfig } from "./workspaceTypes.js";

export async function resolveWorkspace(config: WorkspaceConfig): Promise<ResolvedWorkspace> {
  const { path: workspacePath } = config;
  if (!workspacePath || workspacePath.trim() === "") {
    diagnose("Workspace path is empty");
    throw new WorkspaceError("Workspace path is required");
  }

  let absolutePath: string;
  try {
    absolutePath = isAbsolute(workspacePath) ? workspacePath : resolve(process.cwd(), workspacePath);
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
  return { root: canonicalPath, name: canonicalPath.split("/").pop() || "workspace" };
}
