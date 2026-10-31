import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { readNote } from "./readNote.js";
import { WorkspaceError } from "./workspace.js";
import { createTempDir, cleanupTempDir } from "./readNote.test-utils.js";

describe("readNote - unavailable notes", () => {
  it("rejects non-existent file", async () => {
    const temp = await createTempDir();
    try {
      await expect(readNote(temp, "missing.md")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "missing.md")).rejects.toThrow("Note not found");
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects non-markdown file", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.txt"), "plain text");
      await expect(readNote(temp, "note.txt")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "note.txt")).rejects.toThrow("Expected a Markdown file");
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects directory as note", async () => {
    const temp = await createTempDir();
    try {
      await fs.mkdir(join(temp, "folder"));
      await expect(readNote(temp, "folder")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "folder")).rejects.toThrow("Expected a Markdown file");
    } finally {
      await cleanupTempDir(temp);
    }
  });
});

describe("readNote - extension validation", () => {
  it("rejects .txt files", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.txt"), "text");
      await expect(readNote(temp, "note.txt")).rejects.toThrow("Expected a Markdown file");
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects .json files", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "data.json"), "{}");
      await expect(readNote(temp, "data.json")).rejects.toThrow("Expected a Markdown file");
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects .rs files", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "script.rs"), "fn main() {}");
      await expect(readNote(temp, "script.rs")).rejects.toThrow("Expected a Markdown file");
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects files without extension", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "README"), "# Readme");
      await expect(readNote(temp, "README")).rejects.toThrow("Expected a Markdown file");
    } finally {
      await cleanupTempDir(temp);
    }
  });
});