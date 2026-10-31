import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { readNote } from "./readNote.js";
import { WorkspaceError } from "./workspace.js";

async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_read_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

describe("readNote", () => {
  describe("valid reads", () => {
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

  describe("unavailable notes", () => {
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

  describe("path bounds and traversal", () => {
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

  describe("symlink exclusions", () => {
    it("rejects symlink to file outside workspace", async () => {
      const temp = await createTempDir();
      const targetDir = join(tmpdir(), `marnote_read_target_${Date.now()}`);
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(join(targetDir, "target.md"), "# Target");
      try {
        await fs.symlink(join(targetDir, "target.md"), join(temp, "link.md"));
        await expect(readNote(temp, "link.md")).rejects.toThrow(WorkspaceError);
        await expect(readNote(temp, "link.md")).rejects.toThrow(/Expected a Markdown file|Path escapes workspace/);
      } finally {
        await cleanupTempDir(temp);
        await cleanupTempDir(targetDir);
      }
    });

    it("rejects symlink to directory", async () => {
      const temp = await createTempDir();
      const targetDir = join(tmpdir(), `marnote_read_target_dir_${Date.now()}`);
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(join(targetDir, "target.md"), "# Target");
      try {
        await fs.symlink(targetDir, join(temp, "link_dir"), "dir");
        await expect(readNote(temp, "link_dir/target.md")).rejects.toThrow(WorkspaceError);
      } finally {
        await cleanupTempDir(temp);
        await cleanupTempDir(targetDir);
      }
    });
  });

  describe("extension validation", () => {
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
});