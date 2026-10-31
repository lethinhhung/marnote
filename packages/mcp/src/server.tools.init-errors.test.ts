import { describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { initializeServer } from "./server.js";
import { WorkspaceError } from "./workspace.js";
import {
  createTempDir,
  cleanupTempDir,
} from "./server.testUtils.js";

describe("initializeServer - initialization errors", () => {
  it("rejects invalid workspace path during initialization", async () => {
    await expect(initializeServer({ workspacePath: "/definitely/does/not/exist" })).rejects.toThrow(WorkspaceError);
  });

  it("reports workspace initialization errors to stderr via diagnose", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(initializeServer({ workspacePath: "" })).rejects.toThrow(WorkspaceError);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[mcp]"));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Workspace path is required"));
    consoleErrorSpy.mockRestore();
  });

  it("reports non-directory workspace error to stderr", async () => {
    const tempDir = await createTempDir();
    try {
      const filePath = join(tempDir, "not-a-dir.txt");
      await fs.writeFile(filePath, "content");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(initializeServer({ workspacePath: filePath })).rejects.toThrow(WorkspaceError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[mcp]"));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Workspace must be a directory"));
      consoleErrorSpy.mockRestore();
    } finally {
      await cleanupTempDir(tempDir);
    }
  });
});