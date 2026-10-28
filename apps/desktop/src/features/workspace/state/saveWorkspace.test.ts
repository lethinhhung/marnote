import { describe, expect, it, vi } from "vitest";
import { saveWorkspace } from "./saveWorkspace";

describe("saveWorkspace", () => {
  it("writes the requested workspace file and reports success", async () => {
    const write = vi.fn().mockResolvedValue(undefined);

    const result = await saveWorkspace(write, "/notes", "draft.md", "new text", "old text");

    expect(write).toHaveBeenCalledWith("/notes", "draft.md", "new text", "old text");
    expect(result).toEqual({ ok: true });
  });

  it("reports write failure and preserves its surfaced message", async () => {
    const writeError = new Error("file changed externally");
    const write = vi.fn().mockRejectedValue(writeError);

    const result = await saveWorkspace(write, "/notes", "draft.md", "new text", "old text");

    expect(write).toHaveBeenCalledWith("/notes", "draft.md", "new text", "old text");
    expect(result).toEqual({ ok: false, error: writeError });
    if (!result.ok) expect(String(result.error)).toBe("Error: file changed externally");
  });
});
