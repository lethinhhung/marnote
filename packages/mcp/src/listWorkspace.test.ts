import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { listWorkspace } from "./listWorkspace.js";
import { resolveWorkspace } from "./workspace.js";

async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_list_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

describe("listWorkspace", () => {
  it("lists visible markdown files and folders with workspace-relative paths", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.md"), "# Note");
      await fs.writeFile(join(temp, "README.MD"), "# Readme");
      await fs.mkdir(join(temp, "folder"), { recursive: true });
      await fs.writeFile(join(temp, "folder", "inner.md"), "# Inner");
      await fs.mkdir(join(temp, "folder", "nested"), { recursive: true });
      await fs.writeFile(join(temp, "folder", "nested", "deep.md"), "# Deep");

      const workspace = await resolveWorkspace({ path: temp });
      const entries = await listWorkspace(workspace);

      const names = entries.map((e) => e.name).sort();
      expect(names).toEqual(["README.MD", "folder", "note.md"]);

      const folder = entries.find((e) => e.name === "folder");
      expect(folder?.kind).toBe("directory");
      expect(folder?.path).toBe("folder");
      expect(folder?.children?.length).toBe(2);
      
      const childNames = folder?.children?.map((c) => c.name).sort();
      expect(childNames).toEqual(["inner.md", "nested"]);
      
      const nested = folder?.children?.find((c) => c.name === "nested");
      expect(nested?.kind).toBe("directory");
      expect(nested?.path).toBe("folder/nested");
      expect(nested?.children?.length).toBe(1);
      expect(nested?.children?.[0].name).toBe("deep.md");
      expect(nested?.children?.[0].path).toBe("folder/nested/deep.md");
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("excludes symlinks", async () => {
    const temp = await createTempDir();
    const target = join(tmpdir(), `marnote_test_target_${Date.now()}`);
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(join(target, "target.md"), "# Target");
    try {
      await fs.writeFile(join(temp, "note.md"), "# Note");
      await fs.symlink(target, join(temp, "link_to_dir"), "dir");
      await fs.symlink(join(temp, "note.md"), join(temp, "link_to_file.md"));

      const workspace = await resolveWorkspace({ path: temp });
      const entries = await listWorkspace(workspace);
      const names = entries.map((e) => e.name);
      expect(names).toEqual(["note.md"]);
    } finally {
      await cleanupTempDir(temp);
      await cleanupTempDir(target);
    }
  });

  it("excludes .marnote-trash directory", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.md"), "# Note");
      const trash = join(temp, ".marnote-trash");
      await fs.mkdir(trash);
      await fs.writeFile(join(trash, "deleted_123_note.md"), "# Deleted");

      const workspace = await resolveWorkspace({ path: temp });
      const entries = await listWorkspace(workspace);
      const names = entries.map((e) => e.name);
      expect(names).toEqual(["note.md"]);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("excludes .marnote directory", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.md"), "# Note");
      const marnote = join(temp, ".marnote");
      await fs.mkdir(marnote);
      await fs.writeFile(join(marnote, "config.json"), "{}");

      const workspace = await resolveWorkspace({ path: temp });
      const entries = await listWorkspace(workspace);
      const names = entries.map((e) => e.name);
      expect(names).toEqual(["note.md"]);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("excludes non-markdown files", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "script.rs"), "fn main() {}");
      await fs.writeFile(join(temp, "data.json"), "{}");
      await fs.writeFile(join(temp, "image.png"), "binary");
      await fs.writeFile(join(temp, "readme.txt"), "text");

      const workspace = await resolveWorkspace({ path: temp });
      const entries = await listWorkspace(workspace);
      expect(entries).toEqual([]);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("lists only markdown files when mixed with non-markdown", async () => {
    const temp = await createTempDir();
    try {
      await fs.writeFile(join(temp, "note.md"), "# Note");
      await fs.writeFile(join(temp, "script.rs"), "fn main() {}");
      await fs.writeFile(join(temp, "data.json"), "{}");

      const workspace = await resolveWorkspace({ path: temp });
      const entries = await listWorkspace(workspace);
      const names = entries.map((e) => e.name);
      expect(names).toEqual(["note.md"]);
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("returns empty array for empty workspace", async () => {
    const temp = await createTempDir();
    try {
      const workspace = await resolveWorkspace({ path: temp });
      const entries = await listWorkspace(workspace);
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

      const workspace = await resolveWorkspace({ path: temp });
      const entries = await listWorkspace(workspace);
      const names = entries.map((e) => e.name);
      expect(names).toEqual(["alpha.md", "Beta.md", "Delta", "gamma", "zebra.md"]);
    } finally {
      await cleanupTempDir(temp);
    }
  });
});