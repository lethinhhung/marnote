import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initializeServer } from "./server.js";
import {
  getTools,
  createTempDir,
  cleanupTempDir,
} from "./server.testUtils.js";

describe("initializeServer - basic tools", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await fs.writeFile(join(tempDir, "note.md"), "# Test Note");
    await fs.mkdir(join(tempDir, "folder"), { recursive: true });
    await fs.writeFile(join(tempDir, "folder", "inner.md"), "# Inner Note");
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("resolves workspace and returns server with tools registered", async () => {
    const server = await initializeServer({ workspacePath: tempDir });
    expect(server).toBeInstanceOf(McpServer);
    const tools = getTools(server);
    expect(Object.keys(tools).sort()).toEqual(["list_workspace", "read_note", "search_notes"]);
  });

  it("list_workspace tool returns workspace entries", async () => {
    const server = await initializeServer({ workspacePath: tempDir });
    const result = await getTools(server).list_workspace.handler({});
    const entries = JSON.parse(result.content[0].text) as Array<{ name: string }>;
    expect(entries.map((e) => e.name).sort()).toEqual(["folder", "note.md"]);
  });

  it("read_note tool reads note content", async () => {
    const server = await initializeServer({ workspacePath: tempDir });
    const result = await getTools(server).read_note.handler({ path: "note.md" });
    expect(result.content[0].text).toBe("# Test Note");
  });

  it("read_note tool reads nested note content", async () => {
    const server = await initializeServer({ workspacePath: tempDir });
    const result = await getTools(server).read_note.handler({ path: "folder/inner.md" });
    expect(result.content[0].text).toBe("# Inner Note");
  });
});