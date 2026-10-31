import { describe, expect, it, vi } from "vitest";

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