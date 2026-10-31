import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { readNote } from "./readNote.js";
import { WorkspaceError } from "./workspace.js";
import { createTempDir, cleanupTempDir } from "./readNote.test-utils.js";

describe("readNote - symlink exclusions", () => {
  it("rejects symlink to file outside workspace", async () => {
    const temp = await createTempDir();
    const targetDir = join(tmpdir(), `marnote_read_target_${Date.now()}`);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(join(targetDir, "target.md"), "# Target");
    try {
      await fs.symlink(join(targetDir, "target.md"), join(temp, "link.md"));
      await expect(readNote(temp, "link.md")).rejects.toThrow(WorkspaceError);
      await expect(readNote(temp, "link.md")).rejects.toThrow(/Expected a Markdown file|Path escapes workspace/);
    } finally {
      await cleanupTempDir(temp);
      await cleanupTempDir(targetDir);
    }
  });

  it("rejects symlink to directory", async () => {
    const temp = await createTempDir();
    const targetDir = join(tmpdir(), `marnote_read_target_dir_${Date.now()}`);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(join(targetDir, "target.md"), "# Target");
    try {
      await fs.symlink(targetDir, join(temp, "link_dir"), "dir");
      await expect(readNote(temp, "link_dir/target.md")).rejects.toThrow(WorkspaceError);
    } finally {
      await cleanupTempDir(temp);
      await cleanupTempDir(targetDir);
    }
  });
});