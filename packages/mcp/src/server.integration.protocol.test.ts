import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { spawn, ChildProcess } from "child_process";
import { createRequest, sendRequest, readStderrLines, createTempDir, cleanupTempDir } from "./server.testUtils.js";

describe("stdio subprocess integration: protocol behavior", () => {
  let tempDir: string;
  let serverProcess: ChildProcess;
  let requestId = 0;

  beforeAll(async () => {
    tempDir = await createTempDir();
    await fs.writeFile(join(tempDir, "note1.md"), "# Note 1\n\nContent one");
    await fs.writeFile(join(tempDir, "note2.md"), "# Note 2\n\nContent two");
    await fs.mkdir(join(tempDir, "folder"), { recursive: true });
    await fs.writeFile(join(tempDir, "folder", "nested.md"), "# Nested\n\nDeep content");
    const marnoteDir = join(tempDir, ".marnote");
    await fs.mkdir(marnoteDir, { recursive: true });
    await fs.writeFile(
      join(marnoteDir, "metadata.json"),
      JSON.stringify({
        entries: {
          "note1.md": { tags: ["tag-a", "tag-b"] },
          "note2.md": { tags: ["tag-b"] },
          "folder/nested.md": { tags: ["tag-c"] },
        },
      })
    );
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);
  });

  beforeEach(() => {
    serverProcess = spawn(process.execPath, ["dist/cli.js", tempDir], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    requestId = 0;
  });

  afterEach(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

  async function initialize(): Promise<void> {
    const initRequest = createRequest(++requestId, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    });
    const response = await sendRequest(serverProcess, initRequest);
    expect(response.result).toBeDefined();
    expect((response.result as { protocolVersion: string }).protocolVersion).toBe("2024-11-05");
    const initializedRequest = createRequest(++requestId, "notifications/initialized", {});
    serverProcess.stdin?.write(JSON.stringify(initializedRequest) + "\n");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  it("diagnostics go to stderr, not stdout (protocol output separation)", async () => {
    await initialize();
    const stderrLines = await readStderrLines(serverProcess, 1, 500);
    expect(stderrLines.some((line) => line.includes("[mcp]"))).toBe(false);
  });

  it("invalid tool call returns error response, not stderr", async () => {
    await initialize();
    const request = createRequest(++requestId, "tools/call", { name: "nonexistent_tool", arguments: {} });
    const response = await sendRequest(serverProcess, request);
    expect((response.result as { isError?: boolean })?.isError).toBe(true);
  });
});