import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspace } from "./useWorkspace";

const workspaceOps = vi.hoisted(() => ({
  openWorkspace: vi.fn(),
  listWorkspace: vi.fn(),
  updateEntryMetadata: vi.fn(),
}));

vi.mock("../../platform/workspace", () => ({
  openWorkspace: workspaceOps.openWorkspace,
  listWorkspace: workspaceOps.listWorkspace,
  updateEntryMetadata: workspaceOps.updateEntryMetadata,
}));

describe("useWorkspace metadata updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("refreshes the open workspace tree and exposes updated entry metadata", async () => {
    const initialTree = { name: "Notes", path: "/workspace", entries: [
      { name: "Idea.md", path: "Idea.md", kind: "file" as const },
    ] };
    const refreshedTree = { ...initialTree, entries: [
      { ...initialTree.entries[0], metadata: { tags: ["project"], icon: "✨", favorite: true, createdMs: 10, updatedMs: 20 } },
    ] };
    workspaceOps.openWorkspace.mockResolvedValue(initialTree);
    workspaceOps.updateEntryMetadata.mockResolvedValue(undefined);
    workspaceOps.listWorkspace.mockResolvedValue(refreshedTree);

    const { result } = renderHook(() => useWorkspace());
    await act(async () => { await result.current.open("/workspace"); });
    await act(async () => {
      await result.current.updateMetadata("Idea.md", { tags: ["project"], icon: "✨", favorite: true });
    });

    expect(workspaceOps.updateEntryMetadata).toHaveBeenCalledWith("/workspace", "Idea.md", {
      tags: ["project"], icon: "✨", favorite: true,
    });
    expect(workspaceOps.listWorkspace).toHaveBeenCalledTimes(1);
    expect(workspaceOps.listWorkspace).toHaveBeenCalledWith("/workspace");
    expect(result.current.tree?.entries[0].metadata).toEqual(refreshedTree.entries[0].metadata);
  });
});
