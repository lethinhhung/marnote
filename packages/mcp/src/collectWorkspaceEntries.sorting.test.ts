import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { collectWorkspaceEntries } from "./workspace.js";
import { createTempDir, cleanupTempDir } from "./test-utils.js";

describe("collectWorkspaceEntries - sorting", () => {
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
});