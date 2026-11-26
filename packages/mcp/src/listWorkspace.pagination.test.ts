import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, expect, it } from "vitest";
import { listWorkspace } from "./listWorkspace.js";
import { resolveWorkspace } from "./workspace.js";

describe("listWorkspace pagination", () => {
  it("returns consecutive flat pages and a null cursor at the end", async () => {
    const root = join(tmpdir(), `marnote_mcp_pages_${Date.now()}_${Math.random()}`);
    await fs.mkdir(root, { recursive: true });
    try {
      for (const name of ["a.md", "b.md", "c.md"]) await fs.writeFile(join(root, name), name);
      const workspace = await resolveWorkspace({ path: root });
      const first = await listWorkspace(workspace, 0, 2);
      const second = await listWorkspace(workspace, first.nextOffset ?? 0, 2);

      expect(first.entries.map((entry) => entry.path)).toEqual(["a.md", "b.md"]);
      expect(first.nextOffset).toBe(2);
      expect(second.entries.map((entry) => entry.path)).toEqual(["c.md"]);
      expect(second.offset).toBe(2);
      expect(second.nextOffset).toBeNull();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("omits dot-prefixed files and directories", async () => {
    const root = join(tmpdir(), `marnote_mcp_hidden_${Date.now()}_${Math.random()}`);
    await fs.mkdir(join(root, ".private"), { recursive: true });
    try {
      await fs.writeFile(join(root, ".secret.md"), "secret");
      await fs.writeFile(join(root, ".private", "hidden.md"), "hidden");
      await fs.writeFile(join(root, "visible.md"), "visible");
      const page = await listWorkspace(await resolveWorkspace({ path: root }));
      expect(page.entries.map((entry) => entry.path)).toEqual(["visible.md"]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
