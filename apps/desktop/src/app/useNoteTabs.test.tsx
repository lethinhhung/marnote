import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceTree } from "../shared/domain/workspace";
import { useNoteTabs } from "./useNoteTabs";

const tree: WorkspaceTree = {
  name: "Notes", path: "/notes", entries: [
    { name: "First.md", path: "First.md", kind: "file" },
    { name: "Folder", path: "Folder", kind: "directory", children: [
      { name: "Second.md", path: "Folder/Second.md", kind: "file" },
    ] },
  ],
};

describe("useNoteTabs", () => {
  beforeEach(() => localStorage.clear());

  it("saves the current draft before selecting a tab", async () => {
    const save = vi.fn().mockResolvedValue(true);
    const select = vi.fn();
    const { result } = renderHook(() => useNoteTabs({
      tree, note: { path: "First.md", content: "original" }, draft: "edited",
      setDraft: vi.fn(), save, select, clear: vi.fn(),
    }));
    await act(async () => { await result.current.selectTab("Folder/Second.md"); });
    expect(save).toHaveBeenCalledWith("First.md", "edited", "original");
    expect(select).toHaveBeenCalledWith(tree.entries[1].children?.[0]);
  });

  it("keeps the active note open when saving fails", async () => {
    const save = vi.fn().mockResolvedValue(false);
    const select = vi.fn();
    const { result } = renderHook(() => useNoteTabs({
      tree, note: { path: "First.md", content: "original" }, draft: "edited",
      setDraft: vi.fn(), save, select, clear: vi.fn(),
    }));
    await act(async () => { await result.current.selectTab("Folder/Second.md"); });
    expect(select).not.toHaveBeenCalled();
  });
});
