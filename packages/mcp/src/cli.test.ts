import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { WorkspaceError } from "./workspace.js";

async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_cli_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

describe("parseArgs", () => {
  it("parses valid workspace path", async () => {
    const { parseArgs } = await import("./cli.js");
    const config = parseArgs(["/some/path"]);
    expect(config.workspacePath).toBe("/some/path");
  });

  it("parses relative workspace path", async () => {
    const { parseArgs } = await import("./cli.js");
    const config = parseArgs(["./workspace"]);
    expect(config.workspacePath).toBe("./workspace");
  });

  it("exits with code 1 when no workspace path provided", async () => {
    const { parseArgs } = await import("./cli.js");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      parseArgs([]);
    } catch (e) {
      expect((e as Error).message).toBe("process.exit");
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith("Usage: marnote-mcp <workspace-path>");
    expect(consoleErrorSpy).toHaveBeenCalledWith("  workspace-path  Path to the workspace directory (required)");

    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("exits with code 1 when empty string provided", async () => {
    const { parseArgs } = await import("./cli.js");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      parseArgs([""]);
    } catch (e) {
      expect((e as Error).message).toBe("process.exit");
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith("Usage: marnote-mcp <workspace-path>");

    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });
});

describe("main", () => {
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

  it("calls runServer with parsed config for valid workspace", async () => {
    const runServerMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock("./server.js", () => ({ runServer: runServerMock }));

    vi.resetModules();
    const { main } = await import("./cli.js");

    const originalArgv = process.argv;
    process.argv = ["node", "cli.ts", tempDir];

    const processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await main();
    } catch (e) {
      expect((e as Error).message).toBe("process.exit");
    }

    expect(runServerMock).toHaveBeenCalledWith({ workspacePath: tempDir });
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining("[mcp]"));

    process.argv = originalArgv;
    processExitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("reports workspace error and exits when runServer throws WorkspaceError", async () => {
    const runServerMock = vi.fn().mockRejectedValue(new WorkspaceError("Workspace does not exist"));
    vi.doMock("./server.js", () => ({ runServer: runServerMock }));

    vi.resetModules();
    const { main } = await import("./cli.js");

    const originalArgv = process.argv;
    process.argv = ["node", "cli.ts", "/invalid/path"];

    const processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await main();
    } catch (e) {
      expect((e as Error).message).toBe("process.exit");
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith("[mcp] Workspace does not exist");
    expect(processExitSpy).toHaveBeenCalledWith(1);

    process.argv = originalArgv;
    processExitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("reports generic error and exits when runServer throws unknown error", async () => {
    const runServerMock = vi.fn().mockRejectedValue(new Error("Connection failed"));
    vi.doMock("./server.js", () => ({ runServer: runServerMock }));

    vi.resetModules();
    const { main } = await import("./cli.js");

    const originalArgv = process.argv;
    process.argv = ["node", "cli.ts", tempDir];

    const processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await main();
    } catch (e) {
      expect((e as Error).message).toBe("process.exit");
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith("[mcp] Connection failed");
    expect(processExitSpy).toHaveBeenCalledWith(1);

    process.argv = originalArgv;
    processExitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});