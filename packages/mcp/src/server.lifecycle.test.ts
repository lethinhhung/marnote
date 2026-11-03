import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runServer } from "./server.js";
import { WorkspaceError } from "./workspace.js";
import { createTempDir, cleanupTempDir } from "./server.testUtils.js";

describe("runServer", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await fs.writeFile(join(tempDir, "note.md"), "# Test Note");
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("starts server and connects to stdio transport", async () => {
    const connectSpy = vi.spyOn(McpServer.prototype, "connect").mockResolvedValue(undefined);
    const serverPromise = runServer({ workspacePath: tempDir });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await serverPromise;
    expect(connectSpy).toHaveBeenCalled();
    connectSpy.mockRestore();
  });

  it("throws if workspace initialization fails", async () => {
    await expect(runServer({ workspacePath: "/invalid/path" })).rejects.toThrow(WorkspaceError);
  });
});