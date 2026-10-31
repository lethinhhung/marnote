import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { readNote } from "./readNote.js";
import { createTempDir, cleanupTempDir } from "./readNote.test-utils.js";

describe("readNote - valid reads", () => {
  it("reads a markdown file and returns canonical contents", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.md"), "# Hello\n\nWorld content");
      const result = await readNote(temp, "note.md");

      expect(result.path).toBe("note.md");
      expect(result.content).toBe("# Hello\n\nWorld content");
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("reads markdown file in nested directory", async () => {
    const temp = await createTempDir();
    try {
      await fs.mkdir(join(temp, "folder", "nested"), { recursive: true });
      await fs.writeFile(join(temp, "folder", "nested", "note.md"), "# Nested\n\nDeep content");
      const result = await readNote(temp, "folder/nested/note.md");

      expect(result.path).toBe("folder/nested/note.md");
      expect(result.content).toBe("# Nested\n\nDeep content");
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("reads markdown file with case-insensitive extension", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.MD"), "# Uppercase");
      const result = await readNote(temp, "note.MD");

      expect(result.path).toBe("note.MD");
      expect(result.content).toBe("# Uppercase");
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("reads markdown file with mixed case extension", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.Md"), "# Mixed");
      const result = await readNote(temp, "note.Md");

      expect(result.path).toBe("note.Md");
      expect(result.content).toBe("# Mixed");
    } finally {
      await cleanupTempDir(temp);
    }
  });
});