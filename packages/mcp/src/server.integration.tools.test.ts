import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { spawn, ChildProcess } from "child_process";
import { createRequest, sendRequest, createTempDir, cleanupTempDir } from "./server.testUtils.js";

describe("stdio subprocess integration: tools", () => {
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

  async function callTool(name: string, args: unknown): Promise<unknown> {
    const request = createRequest(++requestId, "tools/call", { name, arguments: args });
    const response = await sendRequest(serverProcess, request);
    if (response.error) throw new Error(`Tool error: ${response.error.message}`);
    const content = (response.result as { content: Array<{ type: string; text: string }> }).content;
    try {
      return JSON.parse(content[0].text);
    } catch {
      return content[0].text;
    }
  }

  it("list_workspace returns workspace entries via stdio", async () => {
    await initialize();
    const entries = (await callTool("list_workspace", {})) as Array<{ name: string }>;
    expect(entries.map((e) => e.name).sort()).toEqual(["folder", "note1.md", "note2.md"]);
  });

  it("read_note reads note content via stdio", async () => {
    await initialize();
    expect(await callTool("read_note", { path: "note1.md" })).toBe("# Note 1\n\nContent one");
  });

  it("read_note reads nested note content via stdio", async () => {
    await initialize();
    expect(await callTool("read_note", { path: "folder/nested.md" })).toBe("# Nested\n\nDeep content");
  });

  it("search_notes searches by title via stdio", async () => {
    await initialize();
    const result = (await callTool("search_notes", { query: "Note 1" })) as { results: Array<{ path: string }>; total: number };
    expect(result.results.some((r) => r.path === "note1.md")).toBe(true);
  });

  it("search_notes searches by tag via stdio", async () => {
    await initialize();
    const result = (await callTool("search_notes", { query: "tag-a" })) as { results: Array<{ path: string }>; total: number };
    expect(result.results.some((r) => r.path === "note1.md")).toBe(true);
  });

  it("search_notes searches by content via stdio", async () => {
    await initialize();
    const result = (await callTool("search_notes", { query: "Content one" })) as { results: Array<{ path: string }>; total: number };
    expect(result.results.some((r) => r.path === "note1.md")).toBe(true);
  });
});