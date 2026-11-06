import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { WorkspaceTree, WorkspaceEntryMetadata } from "../../shared/domain/workspace";

const DB_NAME = "marnote-web";
const DB_VERSION = 1;

interface MarnoteDB extends DBSchema {
  workspace: {
    key: string;
    value: {
      id: string;
      tree: WorkspaceTree;
      updatedAt: number;
    };
    indexes: { "by-updated": number };
  };
  files: {
    key: string;
    value: {
      id: string;
      workspaceId: string;
      path: string;
      content: string;
      modifiedMs: number;
    };
    indexes: { "by-workspace": string; "by-path": string };
  };
  trash: {
    key: string;
    value: {
      id: string;
      workspaceId: string;
      path: string;
      kind: "file" | "directory";
      content?: string;
      metadata?: WorkspaceEntryMetadata;
      deletedAt: number;
      restorable: boolean;
    };
    indexes: { "by-workspace": string };
  };
  tags: {
    key: string;
    value: {
      id: string;
      workspaceId: string;
      tags: Record<string, string>;
    };
    indexes: { "by-workspace": string };
  };
  manualOrder: {
    key: string;
    value: {
      id: string;
      workspaceId: string;
      parent: string;
      paths: string[];
    };
    indexes: { "by-workspace-parent": string };
  };
}

let dbPromise: Promise<IDBPDatabase<MarnoteDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<MarnoteDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MarnoteDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const workspaceStore = db.createObjectStore("workspace", { keyPath: "id" });
        workspaceStore.createIndex("by-updated", "updatedAt");

        const filesStore = db.createObjectStore("files", { keyPath: "id" });
        filesStore.createIndex("by-workspace", "workspaceId");
        filesStore.createIndex("by-path", "path");

        const trashStore = db.createObjectStore("trash", { keyPath: "id" });
        trashStore.createIndex("by-workspace", "workspaceId");

        const tagsStore = db.createObjectStore("tags", { keyPath: "id" });
        tagsStore.createIndex("by-workspace", "workspaceId");

        const orderStore = db.createObjectStore("manualOrder", { keyPath: "id" });
        orderStore.createIndex("by-workspace-parent", "workspaceId");
      },
    });
  }
  return dbPromise;
}
