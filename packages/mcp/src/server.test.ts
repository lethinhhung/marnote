import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initializeServer, runServer } from "./server.js";
import { WorkspaceError } from "./workspace.js";

interface RegisteredTool {
  handler: (args: unknown) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

interface SearchResult {
  results: Array<{ path: string }>;
  total: number;
}

function getTools(server: McpServer): Record<string, RegisteredTool> {
  return (server as unknown as { _registeredTools: Record<string, RegisteredTool> })._registeredTools;
}

async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_server_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

describe("initializeServer", () => {
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
    const toolNames = Object.keys(tools).sort();
    expect(toolNames).toEqual(["list_workspace", "read_note", "search_notes"]);
  });

  it("list_workspace tool returns workspace entries", async () => {
    const server = await initializeServer({ workspacePath: tempDir });

    const listTool = getTools(server).list_workspace;
    expect(listTool).toBeDefined();

    const result = await listTool.handler({});
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].type).toBe("text");

    const entries = JSON.parse(result.content[0].text) as Array<{ name: string }>;
    expect(Array.isArray(entries)).toBe(true);
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(["folder", "note.md"]);
  });

  it("read_note tool reads note content", async () => {
    const server = await initializeServer({ workspacePath: tempDir });

    const readTool = getTools(server).read_note;
    expect(readTool).toBeDefined();

    const result = await readTool.handler({ path: "note.md" });
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe("# Test Note");
  });

  it("read_note tool reads nested note content", async () => {
    const server = await initializeServer({ workspacePath: tempDir });

    const readTool = getTools(server).read_note;
    const result = await readTool.handler({ path: "folder/inner.md" });

    expect(result.content[0].text).toBe("# Inner Note");
  });

  it("search_notes tool is registered with correct schema", async () => {
    const server = await initializeServer({ workspacePath: tempDir });

    const searchTool = getTools(server).search_notes;
    expect(searchTool).toBeDefined();
  });

  it("search_notes tool searches across title, path, tags, and content", async () => {
    const tempDir2 = await createTempDir();
    try {
      await fs.writeFile(join(tempDir2, "note1.md"), "# Project Alpha\n\nContent about alpha.");
      await fs.writeFile(join(tempDir2, "note2.md"), "# Project Beta\n\nContent about beta.");
      await fs.mkdir(join(tempDir2, "projects"), { recursive: true });
      await fs.writeFile(join(tempDir2, "projects", "roadmap.md"), "# Roadmap\n\nFuture plans.");
      const marnoteDir = join(tempDir2, ".marnote");
      await fs.mkdir(marnoteDir, { recursive: true });
      const metadata = {
        entries: {
          "note1.md": { tags: ["project", "active"] },
          "note2.md": { tags: ["project", "planning"] },
          "projects/roadmap.md": { tags: ["planning"] },
        },
      };
      await fs.writeFile(join(marnoteDir, "metadata.json"), JSON.stringify(metadata, null, 2));

      const server = await initializeServer({ workspacePath: tempDir2 });
      const searchTool = getTools(server).search_notes;

      const titleResult = await searchTool.handler({ query: "alpha" });
      const titleData = JSON.parse(titleResult.content[0].text) as SearchResult;
      expect(titleData.results.some((r) => r.path === "note1.md")).toBe(true);

      const tagResult = await searchTool.handler({ query: "planning" });
      const tagData = JSON.parse(tagResult.content[0].text) as SearchResult;
      expect(tagData.results.some((r) => r.path === "note2.md")).toBe(true);
      expect(tagData.results.some((r) => r.path === "projects/roadmap.md")).toBe(true);

      const contentResult = await searchTool.handler({ query: "future" });
      const contentData = JSON.parse(contentResult.content[0].text) as SearchResult;
      expect(contentData.results.some((r) => r.path === "projects/roadmap.md")).toBe(true);

      const pathResult = await searchTool.handler({ query: "projects" });
      const pathData = JSON.parse(pathResult.content[0].text) as SearchResult;
      expect(pathData.results.some((r) => r.path === "projects/roadmap.md")).toBe(true);
    } finally {
      await cleanupTempDir(tempDir2);
    }
  });

  it("search_notes tool returns ranked results with excerpts", async () => {
    const tempDir2 = await createTempDir();
    try {
      await fs.writeFile(join(tempDir2, "alpha.md"), "# Alpha Note\n\nThis is alpha content.");
      await fs.writeFile(join(tempDir2, "beta.md"), "# Beta Note\n\nDifferent content.");
      const marnoteDir = join(tempDir2, ".marnote");
      await fs.mkdir(marnoteDir, { recursive: true });
      await fs.writeFile(join(marnoteDir, "metadata.json"), JSON.stringify({ entries: {} }));

      const server = await initializeServer({ workspacePath: tempDir2 });
      const searchTool = getTools(server).search_notes;

      const result = await searchTool.handler({ query: "alpha" });
      const data = JSON.parse(result.content[0].text);

      expect(data.results[0].source).toBe("Title");
      expect(data.results[0].excerpt).toBe("");
      expect(data.results[0].path).toBe("alpha.md");
    } finally {
      await cleanupTempDir(tempDir2);
    }
  });

  it("search_notes tool respects default limit of 20", async () => {
    const tempDir2 = await createTempDir();
    try {
      for (let i = 0; i < 25; i++) {
        await fs.writeFile(join(tempDir2, `note${i}.md`), `# Note ${i}`);
      }
      const marnoteDir = join(tempDir2, ".marnote");
      await fs.mkdir(marnoteDir, { recursive: true });
      await fs.writeFile(join(marnoteDir, "metadata.json"), JSON.stringify({ entries: {} }));

      const server = await initializeServer({ workspacePath: tempDir2 });
      const searchTool = getTools(server).search_notes;

      const result = await searchTool.handler({ query: "note" });
      const data = JSON.parse(result.content[0].text);

      expect(data.results.length).toBe(20);
      expect(data.total).toBe(20);
    } finally {
      await cleanupTempDir(tempDir2);
    }
  });

  it("search_notes tool caps results at 100", async () => {
    const tempDir2 = await createTempDir();
    try {
      for (let i = 0; i < 120; i++) {
        await fs.writeFile(join(tempDir2, `note${i}.md`), `# Note ${i}`);
      }
      const marnoteDir = join(tempDir2, ".marnote");
      await fs.mkdir(marnoteDir, { recursive: true });
      await fs.writeFile(join(marnoteDir, "metadata.json"), JSON.stringify({ entries: {} }));

      const server = await initializeServer({ workspacePath: tempDir2 });
      const searchTool = getTools(server).search_notes;

      const result = await searchTool.handler({ query: "note", limit: 200 });
      const data = JSON.parse(result.content[0].text);

      expect(data.results.length).toBe(100);
      expect(data.total).toBe(100);
    } finally {
      await cleanupTempDir(tempDir2);
    }
  });

  it("search_notes tool returns workspace-relative paths", async () => {
    const tempDir2 = await createTempDir();
    try {
      await fs.writeFile(join(tempDir2, "note.md"), "# Test");
      const marnoteDir = join(tempDir2, ".marnote");
      await fs.mkdir(marnoteDir, { recursive: true });
      await fs.writeFile(join(marnoteDir, "metadata.json"), JSON.stringify({ entries: {} }));

      const server = await initializeServer({ workspacePath: tempDir2 });
      const searchTool = getTools(server).search_notes;

      const result = await searchTool.handler({ query: "test" });
      const data = JSON.parse(result.content[0].text);

      expect(data.results[0].path).toBe("note.md");
      expect(data.results[0].path).not.toMatch(/^\//);
      expect(data.results[0].path).not.toContain("..");
    } finally {
      await cleanupTempDir(tempDir2);
    }
  });

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
    const filePath = join(tempDir, "not-a-dir.txt");
    await fs.writeFile(filePath, "content");

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(initializeServer({ workspacePath: filePath })).rejects.toThrow(WorkspaceError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[mcp]"));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Workspace must be a directory"));

    consoleErrorSpy.mockRestore();
  });
});

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

    await expect(initializeServer({ workspacePath: "" })).rejects.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("[mcp]"));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining("[mcp]"));

    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("tool results are returned as structured content, not logged", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const server = await initializeServer({ workspacePath: tempDir });
    const listTool = getTools(server).list_workspace;
    await listTool.handler({});

    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining("note.md"));

    consoleLogSpy.mockRestore();
  });
});