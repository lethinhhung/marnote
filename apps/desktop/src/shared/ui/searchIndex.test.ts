import { describe, expect, it, vi } from "vitest";
import { loadSearchIndex, updateSearchIndexContent } from "./searchIndex";
import type { WorkspaceTree } from "../domain/workspace";

function tree(root: string, ...files: { path: string; modifiedMs?: number }[]): WorkspaceTree {
  return {
    name: root,
    path: root,
    entries: files.map(({ path, modifiedMs }) => ({
      name: path.split("/").at(-1)!, path, kind: "file", modifiedMs,
    })),
  };
}

function result(path: string, content: string, modifiedMs: number) {
  return { path, content, modifiedMs };
}

describe("loadSearchIndex", () => {
  it("reads content when a markdown path is missing from the cache", async () => {
    const read = vi.fn(async (_root: string, path: string) => result(path, "fresh", 1));

    await expect(loadSearchIndex(tree("missing", { path: "a.md", modifiedMs: 1 }), read))
      .resolves.toEqual({ "a.md": "fresh" });
    expect(read).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledWith("missing", "a.md");
  });

  it("refreshes content when the cached modification time is stale", async () => {
    updateSearchIndexContent("stale", "a.md", "old", 1);
    const read = vi.fn(async (_root: string, path: string) => result(path, "updated", 2));

    await expect(loadSearchIndex(tree("stale", { path: "a.md", modifiedMs: 2 }), read))
      .resolves.toEqual({ "a.md": "updated" });
    expect(read).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledWith("stale", "a.md");
  });

  it("reuses an entry whose modification time has not changed", async () => {
    updateSearchIndexContent("unchanged", "a.md", "cached", 7);
    const read = vi.fn();

    await expect(loadSearchIndex(tree("unchanged", { path: "a.md", modifiedMs: 7 }), read))
      .resolves.toEqual({ "a.md": "cached" });
    expect(read).not.toHaveBeenCalled();
  });

  it("drops cached paths that are no longer in the workspace tree", async () => {
    updateSearchIndexContent("removed", "gone.md", "old", 1);
    updateSearchIndexContent("removed", "keep.md", "cached", 2);

    await expect(loadSearchIndex(tree("removed", { path: "keep.md", modifiedMs: 2 }), vi.fn()))
      .resolves.toEqual({ "keep.md": "cached" });
  });

  it("returns empty content after a read failure for a missing entry", async () => {
    const read = vi.fn(async () => { throw new Error("unavailable"); });

    await expect(loadSearchIndex(tree("failed-missing", { path: "a.md", modifiedMs: 3 }), read))
      .resolves.toEqual({ "a.md": "" });
  });

  it("keeps stale cached content when refreshing it fails", async () => {
    updateSearchIndexContent("failed-stale", "a.md", "last known", 1);
    const read = vi.fn(async () => { throw new Error("unavailable"); });

    await expect(loadSearchIndex(tree("failed-stale", { path: "a.md", modifiedMs: 2 }), read))
      .resolves.toEqual({ "a.md": "last known" });
    expect(read).toHaveBeenCalledOnce();
  });
});
