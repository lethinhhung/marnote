import { promises as fs } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { readNote } from "./readNote.js";
import { createTempDir, cleanupTempDir } from "./readNote.test-utils.js";

describe("readNote output limit", () => {
  it("truncates content above 64 KiB and marks the response", async () => {
    const root = await createTempDir();
    try {
      await fs.writeFile(join(root, "large.md"), "x".repeat(70 * 1024));
      const result = await readNote(root, "large.md");
      expect(Buffer.byteLength(result.content)).toBeLessThan(65 * 1024);
      expect(result.content).toContain("[Note truncated at 64 KiB]");
    } finally {
      await cleanupTempDir(root);
    }
  });
});
