import { runServer } from "./server.js";

export interface CliConfig {
  workspacePath: string;
}

export function parseArgs(args: string[]): CliConfig {
  const workspacePath = args[0];

  if (!workspacePath) {
    console.error("Usage: marnote-mcp <workspace-path>");
    console.error("");
    console.error("Starts the Marnote MCP server for the specified workspace.");
    console.error("");
    console.error("Arguments:");
    console.error("  workspace-path  Path to the workspace directory (required)");
    process.exit(1);
  }

  return { workspacePath };
}

export async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));

  try {
    await runServer(config);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[mcp] ${error.message}`);
    } else {
      console.error(`[mcp] ${String(error)}`);
    }
    process.exit(1);
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}