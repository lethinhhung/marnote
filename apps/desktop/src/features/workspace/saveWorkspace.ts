export type SaveResult = { ok: true } | { ok: false; error: unknown };
export type WriteWorkspaceFile = (root: string, path: string, content: string, expected: string) => Promise<void>;

export async function saveWorkspace(
  write: WriteWorkspaceFile,
  root: string,
  path: string,
  content: string,
  expected: string,
): Promise<SaveResult> {
  try {
    await write(root, path, content, expected);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
