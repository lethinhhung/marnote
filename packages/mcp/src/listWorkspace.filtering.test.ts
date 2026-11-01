import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { listWorkspace } from "./listWorkspace.js";
import { resolveWorkspace } from "./workspace.js";

async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_list_filtering_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

describe("listWorkspace - markdown filtering and empty workspace", () => {
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
});