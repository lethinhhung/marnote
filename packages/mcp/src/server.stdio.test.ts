import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { initializeServer, runServer } from "./server.js";
import { createTempDir, cleanupTempDir, getTools } from "./server.testUtils.js";

describe("stdio protocol output separation", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await fs.writeFile(join(tempDir, "note.md"), "# Test Note");
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("diagnostics go to stderr, not stdout", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(runServer({ workspacePath: "" })).rejects.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[mcp]"));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining("[mcp]"));
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("tool results are returned as structured content, not logged", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const server = await initializeServer({ workspacePath: tempDir });
    await getTools(server).list_workspace.handler({});
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining("note.md"));
    consoleLogSpy.mockRestore();
  });
});