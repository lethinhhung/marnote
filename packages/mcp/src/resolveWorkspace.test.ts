import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { resolveWorkspace, WorkspaceError } from "./workspace.js";
import { createTempDir, cleanupTempDir } from "./test-utils.js";

describe("resolveWorkspace", () => {
  it("resolves an existing directory and returns canonical path", async () => {
    const temp = await createTempDir();
    try {
      const result = await resolveWorkspace({ path: temp });
      expect(result.root).toBe(await fs.realpath(temp));
      expect(result.name).toBe(temp.split("/").pop());
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("resolves relative paths from cwd", async () => {
    const temp = await createTempDir();
    try {
      const relative = temp.replace(process.cwd() + "/", "");
      const result = await resolveWorkspace({ path: relative });
      expect(result.root).toBe(await fs.realpath(temp));
    } finally {
      await cleanupTempDir(temp);
    }
  });

  it("rejects empty path", async () => {
    await expect(resolveWorkspace({ path: "" })).rejects.toThrow(WorkspaceError);
    await expect(resolveWorkspace({ path: "   " })).rejects.toThrow(WorkspaceError);
  });

  it("rejects non-existent path", async () => {
    await expect(resolveWorkspace({ path: "/definitely/does/not/exist" })).rejects.toThrow(
      WorkspaceError
    );
  });

  it("rejects path that is not a directory", async () => {
    const temp = await createTempDir();
    const filePath = join(temp, "not-a-dir.txt");
    await fs.writeFile(filePath, "content");
    try {
      await expect(resolveWorkspace({ path: filePath })).rejects.toThrow(WorkspaceError);
    } finally {
      await cleanupTempDir(temp);
    }
  });
});