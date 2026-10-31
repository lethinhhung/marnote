import { describe, expect, it } from "vitest";
import { readNote } from "./readNote.js";
import { WorkspaceError } from "./workspace.js";
import { createTempDir, cleanupTempDir } from "./readNote.test-utils.js";

describe("readNote - path bounds and traversal", () => {
  it("rejects empty path", async () => {
    const temp = await createTempDir();
    try {
      await expect(readNote(temp, "")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "   ")).rejects.toThrow(WorkspaceError);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects absolute POSIX paths", async () => {
    const temp = await createTempDir();
    try {
      await expect(readNote(temp, "/etc/passwd")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "/absolute/path.md")).rejects.toThrow(WorkspaceError);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects absolute Windows paths", async () => {
    const temp = await createTempDir();
    try {
      await expect(readNote(temp, "C:\\Windows\\file.md")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "C:/Windows/file.md")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "D:\\path\\file.md")).rejects.toThrow(WorkspaceError);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects parent directory traversal (..)", async () => {
    const temp = await createTempDir();
    try {
      await expect(readNote(temp, "../escape.md")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "folder/../../escape.md")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "folder/..")).rejects.toThrow(WorkspaceError);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects current directory traversal (.)", async () => {
    const temp = await createTempDir();
    try {
      await expect(readNote(temp, "./note.md")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "folder/./note.md")).rejects.toThrow(WorkspaceError);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects paths that resolve outside workspace", async () => {
    const temp = await createTempDir();
    try {
      await expect(readNote(temp, "folder/../../../etc/passwd")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "folder/../../outside.md")).rejects.toThrow(WorkspaceError);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects empty segments in path", async () => {
    const temp = await createTempDir();
    try {
      await expect(readNote(temp, "folder//note.md")).rejects.toThrow(WorkspaceError);
    } finally {
      await cleanupTempDir(temp);
    }
  });
});