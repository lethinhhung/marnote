import { findEntry, notePaths, readSaved, persistTabs, storageKey, type SavedTabs } from "./noteTabStorage";
import type { Entry } from "../shared/domain/workspace";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("noteTabStorage", () => {
  const root = "/test/workspace";
  const key = storageKey(root);

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("storageKey", () => {
    it("generates a namespaced key per workspace root", () => {
      expect(storageKey("/test/workspace")).toBe("marnote-tabs:/test/workspace");
      expect(storageKey("/test/other")).toBe("marnote-tabs:/test/other");
    });
  });

  describe("findEntry", () => {
    const entries: Entry[] = [
      {
        name: "root",
        path: "/test/workspace",
        kind: "directory",
        children: [
          { name: "file1.md", path: "/test/workspace/file1.md", kind: "file" },
          {
            name: "folder",
            path: "/test/workspace/folder",
            kind: "directory",
            children: [{ name: "nested.md", path: "/test/workspace/folder/nested.md", kind: "file" }],
          },
        ],
      },
    ];

    it("finds a file at any nesting level", () => {
      expect(findEntry(entries, "/test/workspace/file1.md")?.path).toBe("/test/workspace/file1.md");
      expect(findEntry(entries, "/test/workspace/folder/nested.md")?.path).toBe("/test/workspace/folder/nested.md");
    });

    it("returns undefined for a missing path or empty input", () => {
      expect(findEntry(entries, "/test/workspace/missing.md")).toBeUndefined();
      expect(findEntry([], "/test/workspace/file1.md")).toBeUndefined();
    });
  });

  describe("notePaths", () => {
    it("collects every file path from a nested tree", () => {
      const entries: Entry[] = [
        { name: "a.md", path: "/test/workspace/a.md", kind: "file" },
        {
          name: "folder",
          path: "/test/workspace/folder",
          kind: "directory",
          children: [
            { name: "b.md", path: "/test/workspace/folder/b.md", kind: "file" },
            { name: "deep.md", path: "/test/workspace/folder/sub/deep.md", kind: "file" },
          ],
        },
      ];
      expect(notePaths(entries)).toEqual([
        "/test/workspace/a.md",
        "/test/workspace/folder/b.md",
        "/test/workspace/folder/sub/deep.md",
      ]);
    });

    it("returns an empty array for empty or undefined input", () => {
      expect(notePaths([])).toEqual([]);
      expect(notePaths(undefined)).toEqual([]);
    });
  });

  describe("readSaved", () => {
    it("returns an empty default state when nothing is stored", () => {
      expect(readSaved(root)).toEqual({ tabs: [], recent: [], active: "", drafts: {}, originals: {}, dirty: [] });
    });

    it("round-trips valid saved tabs through persistTabs", () => {
      const saved: SavedTabs = {
        tabs: ["/test/workspace/a.md", "/test/workspace/b.md"],
        recent: ["/test/workspace/a.md"],
        active: "/test/workspace/a.md",
        drafts: { "/test/workspace/a.md": "draft" },
        originals: { "/test/workspace/a.md": "original" },
        dirty: ["/test/workspace/a.md"],
      };
      persistTabs(root, saved.tabs, saved.active, saved.drafts, saved.originals ?? {}, new Set(saved.dirty), saved.recent);
      expect(readSaved(root)).toEqual(saved);
    });

    it("degrades gracefully on malformed JSON", () => {
      localStorage.setItem(key, "not valid json");
      expect(readSaved(root)).toEqual({ tabs: [], recent: [], active: "", drafts: {} });
    });

    it("coerces malformed array and object fields to safe defaults", () => {
      localStorage.setItem(
        key,
        JSON.stringify({ tabs: "not-an-array", active: 123, drafts: "not-an-object", recent: null }),
      );
      const result = readSaved(root);
      expect(result.tabs).toEqual([]);
      expect(result.active).toBe("");
      expect(result.drafts).toEqual({});
      expect(result.recent).toEqual([]);
    });
  });

  describe("persistTabs", () => {
    it("stores the dirty set as an array under the correct root key", () => {
      persistTabs(root, [], "", {}, {}, new Set(["/a", "/b", "/c"]), []);
      expect(JSON.parse(localStorage.getItem(key)!).dirty).toEqual(["/a", "/b", "/c"]);
      expect(localStorage.getItem(storageKey("/test/other"))).toBeNull();
    });

    it("overwrites previously stored data", () => {
      localStorage.setItem(key, JSON.stringify({ tabs: ["old"], active: "old" }));
      persistTabs(root, ["new"], "new", {}, {}, new Set(), []);
      expect(JSON.parse(localStorage.getItem(key)!).tabs).toEqual(["new"]);
      expect(JSON.parse(localStorage.getItem(key)!).active).toBe("new");
    });
  });
});
