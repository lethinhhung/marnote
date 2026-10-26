import { findEntry, notePaths, readSaved, persistTabs, storageKey, type SavedTabs } from "./noteTabStorage";
import type { Entry } from "../shared/domain/workspace";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

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
    it("generates correct key format", () => {
      expect(storageKey("/test/workspace")).toBe("marnote-tabs:/test/workspace");
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
            children: [
              { name: "nested.md", path: "/test/workspace/folder/nested.md", kind: "file" },
            ],
          },
        ],
      },
    ];

    it("finds entry at root level", () => {
      const result = findEntry(entries, "/test/workspace/file1.md");
      expect(result).toEqual({ name: "file1.md", path: "/test/workspace/file1.md", kind: "file" });
    });

    it("finds entry in nested folder", () => {
      const result = findEntry(entries, "/test/workspace/folder/nested.md");
      expect(result).toEqual({ name: "nested.md", path: "/test/workspace/folder/nested.md", kind: "file" });
    });

    it("finds directory entry", () => {
      const result = findEntry(entries, "/test/workspace/folder");
      expect(result).toEqual({
        name: "folder",
        path: "/test/workspace/folder",
        kind: "directory",
        children: [{ name: "nested.md", path: "/test/workspace/folder/nested.md", kind: "file" }],
      });
    });

    it("returns undefined for non-existent path", () => {
      const result = findEntry(entries, "/test/workspace/missing.md");
      expect(result).toBeUndefined();
    });

    it("returns undefined for empty entries array", () => {
      const result = findEntry([], "/test/workspace/file1.md");
      expect(result).toBeUndefined();
    });

    it("returns undefined when entries is undefined", () => {
      const result = findEntry(undefined, "/test/workspace/file1.md");
      expect(result).toBeUndefined();
    });
  });

  describe("notePaths", () => {
    const entries: Entry[] = [
      {
        name: "root",
        path: "/test/workspace",
        kind: "directory",
        children: [
          { name: "file1.md", path: "/test/workspace/file1.md", kind: "file" },
          { name: "file2.txt", path: "/test/workspace/file2.txt", kind: "file" },
          {
            name: "folder",
            path: "/test/workspace/folder",
            kind: "directory",
            children: [
              { name: "nested.md", path: "/test/workspace/folder/nested.md", kind: "file" },
              { name: "deep.txt", path: "/test/workspace/folder/deep.txt", kind: "file" },
              {
                name: "subfolder",
                path: "/test/workspace/folder/subfolder",
                kind: "directory",
                children: [
                  { name: "deep.md", path: "/test/workspace/folder/subfolder/deep.md", kind: "file" },
                ],
              },
            ],
          },
        ],
      },
    ];

    it("flattens all file paths from tree", () => {
      const result = notePaths(entries);
      expect(result).toEqual([
        "/test/workspace/file1.md",
        "/test/workspace/file2.txt",
        "/test/workspace/folder/nested.md",
        "/test/workspace/folder/deep.txt",
        "/test/workspace/folder/subfolder/deep.md",
      ]);
    });

    it("returns empty array for empty entries", () => {
      const result = notePaths([]);
      expect(result).toEqual([]);
    });

    it("returns empty array when entries is undefined", () => {
      const result = notePaths(undefined);
      expect(result).toEqual([]);
    });

    it("handles directory with no children", () => {
      const entries: Entry[] = [
        { name: "empty", path: "/test/workspace/empty", kind: "directory", children: [] },
      ];
      const result = notePaths(entries);
      expect(result).toEqual([]);
    });

    it("handles only directories", () => {
      const entries: Entry[] = [
        {
          name: "folder1",
          path: "/test/workspace/folder1",
          kind: "directory",
          children: [
            { name: "folder2", path: "/test/workspace/folder1/folder2", kind: "directory", children: [] },
          ],
        },
      ];
      const result = notePaths(entries);
      expect(result).toEqual([]);
    });
  });

  describe("readSaved", () => {
    it("returns default empty state when localStorage is missing", () => {
      const result = readSaved(root);
      expect(result).toEqual({ tabs: [], recent: [], active: "", drafts: {}, originals: {}, dirty: [] });
    });

    it("parses valid saved tabs data", () => {
      const savedData: SavedTabs = {
        tabs: ["/test/workspace/file1.md", "/test/workspace/file2.md"],
        recent: ["/test/workspace/file1.md"],
        active: "/test/workspace/file1.md",
        drafts: { "/test/workspace/file1.md": "draft content" },
        originals: { "/test/workspace/file1.md": "original content" },
        dirty: ["/test/workspace/file1.md"],
      };
      localStorage.setItem(key, JSON.stringify(savedData));

      const result = readSaved(root);
      expect(result).toEqual(savedData);
    });

    it("handles valid data with missing optional fields", () => {
      localStorage.setItem(key, JSON.stringify({ tabs: ["/test/workspace/file1.md"], active: "/test/workspace/file1.md" }));

      const result = readSaved(root);
      expect(result.tabs).toEqual(["/test/workspace/file1.md"]);
      expect(result.active).toBe("/test/workspace/file1.md");
      expect(result.recent).toEqual([]);
      expect(result.drafts).toEqual({});
      expect(result.originals).toEqual({});
      expect(result.dirty).toEqual([]);
    });

    it("handles malformed JSON gracefully", () => {
      localStorage.setItem(key, "not valid json");

      const result = readSaved(root);
      expect(result).toEqual({ tabs: [], recent: [], active: "", drafts: {} });
    });

    it("handles empty string in localStorage", () => {
      localStorage.setItem(key, "");

      const result = readSaved(root);
      expect(result).toEqual({ tabs: [], recent: [], active: "", drafts: {}, originals: {}, dirty: [] });
    });

    it("handles non-array tabs field", () => {
      localStorage.setItem(key, JSON.stringify({ tabs: "not-an-array", active: "/test/workspace/file1.md" }));

      const result = readSaved(root);
      expect(result.tabs).toEqual([]);
      expect(result.active).toBe("/test/workspace/file1.md");
    });

    it("handles non-string active field", () => {
      localStorage.setItem(key, JSON.stringify({ tabs: ["/test/workspace/file1.md"], active: 123 }));

      const result = readSaved(root);
      expect(result.tabs).toEqual(["/test/workspace/file1.md"]);
      expect(result.active).toBe("");
    });

    it("handles non-object drafts field", () => {
      localStorage.setItem(key, JSON.stringify({ drafts: "not-an-object" }));

      const result = readSaved(root);
      expect(result.drafts).toEqual({});
    });

    it("handles non-object originals field", () => {
      localStorage.setItem(key, JSON.stringify({ originals: "not-an-object" }));

      const result = readSaved(root);
      expect(result.originals).toEqual({});
    });

    it("handles non-array dirty field", () => {
      localStorage.setItem(key, JSON.stringify({ dirty: "not-an-array" }));

      const result = readSaved(root);
      expect(result.dirty).toEqual([]);
    });

    it("handles non-array recent field", () => {
      localStorage.setItem(key, JSON.stringify({ recent: "not-an-array" }));

      const result = readSaved(root);
      expect(result.recent).toEqual([]);
    });

    it("handles null localStorage value", () => {
      localStorage.setItem(key, "null");

      const result = readSaved(root);
      expect(result).toEqual({ tabs: [], recent: [], active: "", drafts: {} });
    });

    it("handles localStorage throwing on getItem", () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = readSaved(root);
      expect(result).toEqual({ tabs: [], recent: [], active: "", drafts: {}, originals: {}, dirty: [] });

      localStorage.getItem = originalGetItem;
    });
  });

  describe("persistTabs", () => {
    it("serializes and stores tabs data in localStorage", () => {
      persistTabs(root, ["/test/workspace/file1.md"], "/test/workspace/file1.md", { "/test/workspace/file1.md": "draft" }, { "/test/workspace/file1.md": "original" }, new Set(["/test/workspace/file1.md"]), ["/test/workspace/file1.md"]);

      const stored = localStorage.getItem(key);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual({
        tabs: ["/test/workspace/file1.md"],
        recent: ["/test/workspace/file1.md"],
        active: "/test/workspace/file1.md",
        drafts: { "/test/workspace/file1.md": "draft" },
        originals: { "/test/workspace/file1.md": "original" },
        dirty: ["/test/workspace/file1.md"],
      });
    });

    it("converts dirty Set to array", () => {
      persistTabs(root, [], "", {}, {}, new Set(["/a", "/b", "/c"]), []);

      const stored = JSON.parse(localStorage.getItem(key)!);
      expect(stored.dirty).toEqual(["/a", "/b", "/c"]);
      expect(Array.isArray(stored.dirty)).toBe(true);
    });

    it("handles empty data correctly", () => {
      persistTabs(root, [], "", {}, {}, new Set(), []);

      const stored = JSON.parse(localStorage.getItem(key)!);
      expect(stored).toEqual({ tabs: [], recent: [], active: "", drafts: {}, originals: {}, dirty: [] });
    });

    it("overwrites existing data", () => {
      localStorage.setItem(key, JSON.stringify({ tabs: ["old"], active: "old" }));

      persistTabs(root, ["new"], "new", {}, {}, new Set(), []);

      const stored = JSON.parse(localStorage.getItem(key)!);
      expect(stored.tabs).toEqual(["new"]);
      expect(stored.active).toBe("new");
    });

    it("uses correct storage key for different roots", () => {
      const root2 = "/test/other";
      persistTabs(root2, ["/test/other/file.md"], "/test/other/file.md", {}, {}, new Set(), []);

      expect(localStorage.getItem(storageKey(root))).toBeNull();
      expect(localStorage.getItem(storageKey(root2))).not.toBeNull();
    });
  });
});