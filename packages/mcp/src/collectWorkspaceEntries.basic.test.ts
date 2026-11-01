import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { collectWorkspaceEntries } from "./workspace.js";
import { createTempDir, cleanupTempDir } from "./test-utils.js";

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