export class WorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export function diagnose(message: string): void {
  console.error(`[mcp] ${message}`);
}
