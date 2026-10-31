import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

export async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}