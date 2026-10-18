export type Entry = { name: string; path: string; kind: "directory" | "file"; children?: Entry[] };
export type WorkspaceTree = { name: string; path: string; entries: Entry[] };
export type NoteData = { path: string; content: string };
