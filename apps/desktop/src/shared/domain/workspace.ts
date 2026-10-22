export type WorkspaceEntryMetadata = {
  tags?: string[];
  icon?: string;
  favorite?: boolean;
  createdMs?: number;
  updatedMs?: number;
};
export type Entry = { name: string; path: string; kind: "directory" | "file"; isEmpty?: boolean; modifiedMs?: number; metadata?: WorkspaceEntryMetadata; children?: Entry[] };
export type WorkspaceTree = { name: string; path: string; entries: Entry[]; tags?: Record<string, string>; manualOrder?: Record<string, string[]> };
export type WorkspaceTag = { name: string; color: string };
