import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { resolve, join } from "path";
import { tmpdir } from "os";
import {
  resolveWorkspace,
  validateWorkspaceRelativePath,
  isSymlink,
  isMarkdownFile,
  collectWorkspaceEntries,
  WorkspaceError,
} from "./workspace.js";

async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

describe("resolveWorkspace", () => {
  it("resolves an existing directory and returns canonical path", async () => {
    const temp = await createTempDir();
    try {
      const result = await resolveWorkspace({ path: temp });
      expect(result.root).toBe(await fs.realpath(temp));
      expect(result.name).toBe(temp.split("/").pop());
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("resolves relative paths from cwd", async () => {
    const temp = await createTempDir();
    try {
      const relative = temp.replace(process.cwd() + "/", "");
      const result = await resolveWorkspace({ path: relative });
      expect(result.root).toBe(await fs.realpath(temp));
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects empty path", async () => {
    await expect(resolveWorkspace({ path: "" })).rejects.toThrow(WorkspaceError);
    await expect(resolveWorkspace({ path: "   " })).rejects.toThrow(WorkspaceError);
  });

  it("rejects non-existent path", async () => {
    await expect(resolveWorkspace({ path: "/definitely/does/not/exist" })).rejects.toThrow(
      WorkspaceError
    );
  });

  it("rejects path that is not a directory", async () => {
    const temp = await createTempDir();
    const filePath = join(temp, "not-a-dir.txt");
    await fs.writeFile(filePath, "content");
    try {
      await expect(resolveWorkspace({ path: filePath })).rejects.toThrow(WorkspaceError);
    } finally {
      await cleanupTempDir(temp);
    }
  });
});

describe("validateWorkspaceRelativePath", () => {
  const root = "/workspace";

  it("accepts valid relative paths", () => {
    expect(validateWorkspaceRelativePath(root, "note.md")).toBe(resolve(root, "note.md"));
    expect(validateWorkspaceRelativePath(root, "folder/note.md")).toBe(
      resolve(root, "folder/note.md")
    );
    expect(validateWorkspaceRelativePath(root, "deep/nested/folder/file.md")).toBe(
      resolve(root, "deep/nested/folder/file.md")
    );
  });

  it("rejects empty path", () => {
    expect(() => validateWorkspaceRelativePath(root, "")).toThrow(WorkspaceError);
    expect(() => validateWorkspaceRelativePath(root, "   ")).toThrow(WorkspaceError);
  });

  it("rejects absolute paths", () => {
    expect(() => validateWorkspaceRelativePath(root, "/absolute/path.md")).toThrow(WorkspaceError);
    expect(() => validateWorkspaceRelativePath(root, "C:\\absolute\\path.md")).toThrow(
      WorkspaceError
    );
  });

  it("rejects traversal attempts", () => {
    expect(() => validateWorkspaceRelativePath(root, "../escape.md")).toThrow(WorkspaceError);
    expect(() => validateWorkspaceRelativePath(root, "folder/../../escape.md")).toThrow(
      WorkspaceError
    );
    expect(() => validateWorkspaceRelativePath(root, "./note.md")).toThrow(WorkspaceError);
  });

  it("rejects empty segments", () => {
    expect(() => validateWorkspaceRelativePath(root, "folder//note.md")).toThrow(WorkspaceError);
    expect(() => validateWorkspaceRelativePath(root, "/note.md")).toThrow(WorkspaceError);
  });

  it("ensures resolved path stays within workspace root", () => {
    expect(() => validateWorkspaceRelativePath(root, "folder/../../../etc/passwd")).toThrow(
      WorkspaceError
    );
  });
});

describe("isSymlink", () => {
  it("returns false for regular files", async () => {
    const temp = await createTempDir();
    const filePath = join(temp, "file.txt");
    await fs.writeFile(filePath, "content");
    try {
      expect(await isSymlink(filePath)).toBe(false);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("returns false for directories", async () => {
    const temp = await createTempDir();
    try {
      expect(await isSymlink(temp)).toBe(false);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("returns false for non-existent paths", async () => {
    expect(await isSymlink("/definitely/does/not/exist")).toBe(false);
  });
});

describe("isMarkdownFile", () => {
  it("returns true for .md files (case insensitive)", () => {
    expect(isMarkdownFile("note.md")).toBe(true);
    expect(isMarkdownFile("NOTE.MD")).toBe(true);
    expect(isMarkdownFile("Note.Md")).toBe(true);
    expect(isMarkdownFile("folder/note.md")).toBe(true);
  });

  it("returns false for non-markdown files", () => {
    expect(isMarkdownFile("note.txt")).toBe(false);
    expect(isMarkdownFile("script.rs")).toBe(false);
    expect(isMarkdownFile("data.json")).toBe(false);
    expect(isMarkdownFile("image.png")).toBe(false);
    expect(isMarkdownFile("folder")).toBe(false);
  });
});

describe("collectWorkspaceEntries", () => {
  it("collects directories and markdown files recursively", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.md"), "# Note");
      await fs.writeFile(join(temp, "README.MD"), "# Readme");
      await fs.writeFile(join(temp, "draft.Md"), "# Draft");
      await fs.writeFile(join(temp, "script.rs"), "fn main() {}");
      await fs.writeFile(join(temp, "data.json"), "{}");
      await fs.mkdir(join(temp, "folder"), { recursive: true });
      await fs.writeFile(join(temp, "folder", "inner.md"), "# Inner");

      const entries = await collectWorkspaceEntries(temp, temp);

      const names = entries.map((e) => e.name);
      expect(names).toEqual(["draft.Md", "folder", "note.md", "README.MD"]);

      const folder = entries.find((e) => e.name === "folder");
      expect(folder?.kind).toBe("directory");
      expect(folder?.children?.length).toBe(1);
      expect(folder?.children?.[0].name).toBe("inner.md");
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("skips symlinks", async () => {
    const temp = await createTempDir();
    const target = join(tmpdir(), `marnote_test_target_${Date.now()}`);
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(join(target, "target.md"), "# Target");
    try {
      await fs.writeFile(join(temp, "note.md"), "# Note");
      await fs.symlink(target, join(temp, "link_to_dir"), "dir");
      await fs.symlink(join(temp, "note.md"), join(temp, "link_to_file.md"));

      const entries = await collectWorkspaceEntries(temp, temp);
      const names = entries.map((e) => e.name);
      expect(names).toEqual(["note.md"]);
    } finally {
      await cleanupTempDir(temp);
      await cleanupTempDir(target);
    }
  });

  it("skips .marnote-trash directory", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.md"), "# Note");
      const trash = join(temp, ".marnote-trash");
      await fs.mkdir(trash);
      await fs.writeFile(join(trash, "deleted_123_note.md"), "# Deleted");

      const entries = await collectWorkspaceEntries(temp, temp);
      const names = entries.map((e) => e.name);
      expect(names).toEqual(["note.md"]);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("skips .marnote directory", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.md"), "# Note");
      const marnote = join(temp, ".marnote");
      await fs.mkdir(marnote);
      await fs.writeFile(join(marnote, "config.json"), "{}");

      const entries = await collectWorkspaceEntries(temp, temp);
      const names = entries.map((e) => e.name);
      expect(names).toEqual(["note.md"]);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("skips non-markdown files", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "script.rs"), "fn main() {}");
      await fs.writeFile(join(temp, "data.json"), "{}");
      await fs.writeFile(join(temp, "image.png"), "binary");

      const entries = await collectWorkspaceEntries(temp, temp);
      expect(entries).toEqual([]);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("sorts entries case-insensitively", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "zebra.md"), "# Z");
      await fs.writeFile(join(temp, "alpha.md"), "# A");
      await fs.writeFile(join(temp, "Beta.md"), "# B");
      await fs.mkdir(join(temp, "gamma"));
      await fs.mkdir(join(temp, "Delta"));

      const entries = await collectWorkspaceEntries(temp, temp);
      const names = entries.map((e) => e.name);
      expect(names).toEqual(["alpha.md", "Beta.md", "Delta", "gamma", "zebra.md"]);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("sorts children recursively", async () => {
    const temp = await createTempDir();
    try {
      const folder = join(temp, "folder");
      await fs.mkdir(folder);
      await fs.writeFile(join(folder, "zebra.md"), "# Z");
      await fs.writeFile(join(folder, "alpha.md"), "# A");

      const entries = await collectWorkspaceEntries(temp, temp);
      const folderEntry = entries.find((e) => e.name === "folder");
      const childNames = folderEntry?.children?.map((c) => c.name);
      expect(childNames).toEqual(["alpha.md", "zebra.md"]);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("returns empty for empty directory", async () => {
    const temp = await createTempDir();
    try {
      const entries = await collectWorkspaceEntries(temp, temp);
      expect(entries).toEqual([]);
    } finally {
      await cleanupTempDir(temp);
    }
  });
});