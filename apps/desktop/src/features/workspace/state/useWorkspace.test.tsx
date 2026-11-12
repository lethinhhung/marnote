import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspace } from "./useWorkspace";

const workspaceOps = vi.hoisted(() => ({
  openWorkspace: vi.fn(),
  listWorkspace: vi.fn(),
  readFile: vi.fn(),
  updateEntryMetadata: vi.fn(),
  saveWorkspaceTags: vi.fn(),
  saveManualOrder: vi.fn(),
  moveFile: vi.fn(),
}));

vi.mock("../../../platform/workspace", () => ({
  openWorkspace: workspaceOps.openWorkspace,
  listWorkspace: workspaceOps.listWorkspace,
  readFile: workspaceOps.readFile,
  updateEntryMetadata: workspaceOps.updateEntryMetadata,
  saveWorkspaceTags: workspaceOps.saveWorkspaceTags,
  saveManualOrder: workspaceOps.saveManualOrder,
  moveFile: workspaceOps.moveFile,
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
    workspaceOps.saveWorkspaceTags.mockResolvedValue(undefined);
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

  it("polls the active workspace tree for external changes", async () => {
    const tree = { name: "Notes", path: "/workspace", entries: [] };
    workspaceOps.openWorkspace.mockResolvedValue(tree);
    workspaceOps.listWorkspace.mockResolvedValue(tree);
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useWorkspace());
    await act(async () => { await result.current.open("/workspace"); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(workspaceOps.listWorkspace).toHaveBeenCalledWith("/workspace");
    unmount();
    vi.useRealTimers();
  });
});

describe("useWorkspace reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("returns false when tree refresh fails after backend succeeds", async () => {
    const initialTree = { name: "Notes", path: "/workspace", entries: [
      { name: "A.md", path: "A.md", kind: "file" as const },
      { name: "B.md", path: "B.md", kind: "file" as const },
    ] };
    workspaceOps.openWorkspace.mockResolvedValue(initialTree);
    workspaceOps.saveManualOrder.mockResolvedValue(undefined);
    workspaceOps.listWorkspace.mockRejectedValue(new Error("refresh failed"));

    const { result } = renderHook(() => useWorkspace());
    await act(async () => { await result.current.open("/workspace"); });

    const success = await act(async () => await result.current.reorder("", ["B.md", "A.md"]));

    expect(workspaceOps.saveManualOrder).toHaveBeenCalledWith("/workspace", "", ["B.md", "A.md"]);
    expect(workspaceOps.listWorkspace).toHaveBeenCalledWith("/workspace");
    expect(success).toBe(false);
  });
});

describe("useWorkspace move", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("returns false when tree refresh fails after backend succeeds", async () => {
    const initialTree = { name: "Notes", path: "/workspace", entries: [
      { name: "A.md", path: "A.md", kind: "file" as const },
    ] };
    workspaceOps.openWorkspace.mockResolvedValue(initialTree);
    workspaceOps.moveFile.mockResolvedValue(undefined);
    workspaceOps.listWorkspace.mockRejectedValue(new Error("refresh failed"));

    const { result } = renderHook(() => useWorkspace());
    await act(async () => { await result.current.open("/workspace"); });

    const success = await act(async () => await result.current.move("A.md", "B.md"));

    expect(workspaceOps.moveFile).toHaveBeenCalledWith("/workspace", "A.md", "B.md");
    expect(workspaceOps.listWorkspace).toHaveBeenCalledWith("/workspace");
    expect(success).toBe(false);
  });

  it("does not update note path when tree refresh fails after backend succeeds", async () => {
    const initialTree = { name: "Notes", path: "/workspace", entries: [
      { name: "A.md", path: "A.md", kind: "file" as const },
    ] };
    workspaceOps.openWorkspace.mockResolvedValue(initialTree);
    workspaceOps.moveFile.mockResolvedValue(undefined);
    workspaceOps.listWorkspace.mockRejectedValue(new Error("refresh failed"));
    workspaceOps.readFile.mockResolvedValue({ path: "A.md", content: "test content", modifiedMs: 1000 });

    const { result } = renderHook(() => useWorkspace());
    await act(async () => { await result.current.open("/workspace"); });
    await act(async () => { await result.current.select({ name: "A.md", path: "A.md", kind: "file" as const }); });

    expect(result.current.note?.path).toBe("A.md");

    const success = await act(async () => await result.current.move("A.md", "B.md"));

    expect(success).toBe(false);
    expect(result.current.note?.path).toBe("A.md");
  });
});

describe("useWorkspace rename (alias for renameOrMove)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("does not update note path when tree refresh fails after backend succeeds", async () => {
    const initialTree = { name: "Notes", path: "/workspace", entries: [
      { name: "A.md", path: "A.md", kind: "file" as const },
    ] };
    workspaceOps.openWorkspace.mockResolvedValue(initialTree);
    workspaceOps.moveFile.mockResolvedValue(undefined);
    workspaceOps.listWorkspace.mockRejectedValue(new Error("refresh failed"));
    workspaceOps.readFile.mockResolvedValue({ path: "A.md", content: "test content", modifiedMs: 1000 });

    const { result } = renderHook(() => useWorkspace());
    await act(async () => { await result.current.open("/workspace"); });
    await act(async () => { await result.current.select({ name: "A.md", path: "A.md", kind: "file" as const }); });

    expect(result.current.note?.path).toBe("A.md");

    await act(async () => { result.current.rename("A.md", "B.md"); });

    expect(workspaceOps.moveFile).toHaveBeenCalledWith("/workspace", "A.md", "B.md");
    expect(workspaceOps.listWorkspace).toHaveBeenCalled();
    expect(result.current.error).toContain("refresh failed");
    expect(result.current.note?.path).toBe("A.md");
  });
});
