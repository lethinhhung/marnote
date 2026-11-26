import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { listWorkspace } from "./listWorkspace.js";
import { resolveWorkspace } from "./workspace.js";

async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_list_structure_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

describe("listWorkspace - structure and sorting", () => {
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

      expect(entries.entries.map((entry) => entry.path)).toEqual([
        "folder", "folder/inner.md", "folder/nested", "folder/nested/deep.md",
        "note.md", "README.MD",
      ]);
      expect(entries.entries.find((entry) => entry.path === "folder")?.kind).toBe("directory");
      expect(entries.entries.find((entry) => entry.path === "folder/nested/deep.md")?.kind).toBe("file");
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
      const names = entries.entries.map((e) => e.name);
      expect(names).toEqual(["alpha.md", "Beta.md", "Delta", "gamma", "zebra.md"]);
    } finally {
      await cleanupTempDir(temp);
    }
  });
});
