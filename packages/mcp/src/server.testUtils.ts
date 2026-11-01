import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { ChildProcess } from "child_process";

export interface RegisteredTool {
  handler: (args: unknown) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

export interface SearchResult {
  results: Array<{ path: string }>;
  total: number;
}

export function getTools(server: McpServer): Record<string, RegisteredTool> {
  return (server as unknown as { _registeredTools: Record<string, RegisteredTool> })._registeredTools;
}

export async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_server_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

export async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

export interface McpRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
}

export interface McpResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export function createRequest(id: number | string, method: string, params?: unknown): McpRequest {
  return { jsonrpc: "2.0", id, method, params };
}

export async function waitForLine(
  process: ChildProcess,
  stream: "stdout" | "stderr",
  timeout = 2000
): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout);
    const handler = (data: Buffer) => {
      clearTimeout(timer);
      const line = data.toString().trim();
      if (line) {
        process[stream]?.off("data", handler);
        resolve(line);
      }
    };
    process[stream]?.on("data", handler);
  });
}

export async function sendRequest(process: ChildProcess, request: McpRequest): Promise<McpResponse> {
  const line = JSON.stringify(request);
  process.stdin?.write(line + "\n");
  const responseLine = await waitForLine(process, "stdout");
  if (!responseLine) {
    throw new Error("No response received");
  }
  return JSON.parse(responseLine) as McpResponse;
}

export async function readStderrLines(
  process: ChildProcess,
  count: number,
  timeout = 1000
): Promise<string[]> {
  const lines: string[] = [];
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(lines), timeout);
    const handler = (data: Buffer) => {
      const line = data.toString().trim();
      if (line) {
        lines.push(line);
        if (lines.length >= count) {
          clearTimeout(timer);
          process.stderr?.off("data", handler);
          resolve(lines);
        }
      }
    };
    process.stderr?.on("data", handler);
  });
}