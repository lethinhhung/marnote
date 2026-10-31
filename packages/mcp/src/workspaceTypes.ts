export interface WorkspaceConfig {
  path: string;
}

export interface ResolvedWorkspace {
  root: string;
  name: string;
}

export interface WorkspaceEntry {
  name: string;
  path: string;
  kind: "file" | "directory";
  children?: WorkspaceEntry[];
}
