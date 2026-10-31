import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolveWorkspace, ResolvedWorkspace, WorkspaceError, diagnose } from "./workspace.js";
import { listWorkspace } from "./listWorkspace.js";
import { readNote } from "./readNote.js";
import { searchNotes } from "./searchNotes.js";

export interface ServerConfig {
  workspacePath: string;
}

let resolvedWorkspace: ResolvedWorkspace | null = null;

export async function initializeServer(config: ServerConfig): Promise<McpServer> {
  try {
    resolvedWorkspace = await resolveWorkspace({ path: config.workspacePath });
  } catch (error) {
    if (error instanceof WorkspaceError) {
      diagnose(`Failed to initialize workspace: ${error.message}`);
    } else {
      diagnose(`Failed to initialize workspace: ${String(error)}`);
    }
    throw error;
  }

  const server = new McpServer(
    { name: "marnote", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.registerTool(
    "list_workspace",
    {
      title: "List Workspace",
      description: "List visible Markdown files and folders in the workspace",
      inputSchema: {},
    },
    async () => {
      if (!resolvedWorkspace) {
        throw new Error("Workspace not initialized");
      }
      const entries = await listWorkspace(resolvedWorkspace);
      return {
        content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
      };
    }
  );

  server.registerTool(
    "read_note",
    {
      title: "Read Note",
      description: "Read a Markdown note from the workspace",
      inputSchema: {
        path: z.string().describe("Workspace-relative path to the Markdown file"),
      },
    },
    async ({ path }) => {
      if (!resolvedWorkspace) {
        throw new Error("Workspace not initialized");
      }
      const result = await readNote(resolvedWorkspace.root, path);
      return {
        content: [{ type: "text", text: result.content }],
      };
    }
  );

  server.registerTool(
    "search_notes",
    {
      title: "Search Notes",
      description: "Search notes by title, path, tags, and content",
      inputSchema: {
        query: z.string().describe("Search query"),
        limit: z.number().int().positive().max(100).optional().describe("Maximum results (default 20, max 100)"),
      },
    },
    async ({ query, limit }) => {
      if (!resolvedWorkspace) {
        throw new Error("Workspace not initialized");
      }
      const result = await searchNotes(resolvedWorkspace, query, limit);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}

export async function runServer(config: ServerConfig): Promise<void> {
  const server = await initializeServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}