import { collectWorkspaceEntries, ResolvedWorkspace, WorkspaceEntry } from "./workspace.js";

export async function listWorkspace(workspace: ResolvedWorkspace): Promise<WorkspaceEntry[]> {
  return collectWorkspaceEntries(workspace.root, workspace.root);
}