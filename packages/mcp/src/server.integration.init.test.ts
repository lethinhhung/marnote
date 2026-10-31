import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { spawn, ChildProcess } from "child_process";
import { createRequest, sendRequest, createTempDir, cleanupTempDir } from "./server.testUtils.js";

describe("stdio subprocess integration: initialization", () => {
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

  async function listTools(): Promise<string[]> {
    const request = createRequest(++requestId, "tools/list", {});
    const response = await sendRequest(serverProcess, request);
    return (response.result as { tools: Array<{ name: string }> }).tools.map((t) => t.name).sort();
  }

  it("starts server and exposes exactly three tools", async () => {
    await initialize();
    expect(await listTools()).toEqual(["list_workspace", "read_note", "search_notes"]);
  });

  it("no additional tools are exposed beyond the three specified", async () => {
    await initialize();
    const tools = await listTools();
    expect(tools.length).toBe(3);
    expect(tools).not.toContain("write_note");
    expect(tools).not.toContain("delete_note");
    expect(tools).not.toContain("git");
    expect(tools).not.toContain("backlinks");
  });
});