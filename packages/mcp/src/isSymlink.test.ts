import { describe, expect, it } from "vitest";
import { join } from "path";
import { promises as fs } from "fs";
import { isSymlink } from "./workspace.js";
import { createTempDir, cleanupTempDir } from "./test-utils.js";

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