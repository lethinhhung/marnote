import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { listWorkspace } from "./listWorkspace.js";
import { resolveWorkspace } from "./workspace.js";

async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_list_exclusions_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

describe("listWorkspace - exclusions", () => {
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
});