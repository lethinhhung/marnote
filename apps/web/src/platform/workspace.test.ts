import { beforeEach, describe, expect, it, vi } from "vitest";
import { openDB } from "idb";

vi.mock("idb");

const mockPut = vi.fn();
const mockGet = vi.fn();
const mockGetFromIndex = vi.fn();
const mockGetAllFromIndex = vi.fn();
const mockDelete = vi.fn();
const mockTransaction = vi.fn();
const mockClear = vi.fn();
const mockObjectStore = vi.fn();

const clearedStores: string[] = [];

const mockDB = {
  put: mockPut,
  get: mockGet,
  getFromIndex: mockGetFromIndex,
  getAllFromIndex: mockGetAllFromIndex,
  delete: mockDelete,
  transaction: mockTransaction,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mocked(openDB).mockResolvedValue(mockDB as any);

function createTransactionMock() {
  clearedStores.length = 0;
  const storeClears: Record<string, ReturnType<typeof vi.fn>> = {};
  const stores = ["workspace", "files", "trash", "tags", "manualOrder"];
  for (const store of stores) {
    storeClears[store] = vi.fn(() => {
      clearedStores.push(store);
    });
  }
  mockObjectStore.mockImplementation((storeName: string) => ({
    clear: storeClears[storeName] || mockClear,
  }));
  return {
    objectStore: mockObjectStore,
    done: Promise.resolve(),
  };
}

mockTransaction.mockImplementation(createTransactionMock);

import {
  QuotaExceededError,
  createFile,
  createFolder,
  deleteFile,
  downloadNoteAsMarkdown,
  importWorkspace,
  moveFile,
  restoreTrash,
  saveManualOrder,
  saveWorkspaceTags,
  updateEntryMetadata,
  validateZipEntryPaths,
  writeFile,
} from "./workspace";
import { normalizeWorkspacePath } from "@marnote/core";

const QUOTA_ERROR = new DOMException("Quota exceeded", "QuotaExceededError");

const defaultTree = {
  id: "default",
  tree: {
    name: "Notes",
    path: "/",
    entries: [],
    tags: {},
    manualOrder: {},
  },
  updatedAt: Date.now(),
};

const defaultFile = {
  id: "/:test.md",
  workspaceId: "/",
  path: "test.md",
  content: "old content",
  modifiedMs: Date.now(),
};

const defaultFileForMove = {
  id: "/:source.md",
  workspaceId: "/",
  path: "source.md",
  content: "source content",
  modifiedMs: Date.now(),
};

const trashItem = {
  id: "trash-1",
  workspaceId: "/",
  path: "restored.md",
  kind: "file" as const,
  content: "restored content",
  metadata: undefined,
  deletedAt: Date.now(),
  restorable: true,
};

function setupBasicMocks() {
  mockGet.mockReset();
  mockGetFromIndex.mockReset();
  mockGetAllFromIndex.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
  mockTransaction.mockReset();
  mockClear.mockReset();
  mockObjectStore.mockReset();
  clearedStores.length = 0;

  mockGet.mockResolvedValue(defaultTree);
  mockGetFromIndex.mockResolvedValue(defaultFile);
  mockGetAllFromIndex.mockResolvedValue([]);
  mockPut.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  mockTransaction.mockReturnValue(createTransactionMock());
}

describe("workspace platform quota handling", () => {
  beforeEach(() => {
    setupBasicMocks();
  });

  it("writeFile throws QuotaExceededError when putFile fails with quota error", async () => {
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    await expect(writeFile("/", "test.md", "new content", "old content")).rejects.toThrow(
      QuotaExceededError
    );
  });

  it("writeFile preserves draft content when quota error occurs", async () => {
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    const draftContent = "important draft content";
    try {
      await writeFile("/", "test.md", draftContent, "old content");
    } catch (error) {
      expect(error).toBeInstanceOf(QuotaExceededError);
    }

    const putCall = mockPut.mock.calls.find((call) => call[0] === "files");
    expect(putCall).toBeDefined();
    expect(putCall?.[1]).toMatchObject({
      content: draftContent,
    });
  });

  it("createFile throws QuotaExceededError when putFile fails with quota error", async () => {
    mockGetFromIndex.mockResolvedValueOnce(null);
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    await expect(createFile("/", "new.md", "content")).rejects.toThrow(QuotaExceededError);
  });

  it("createFolder throws QuotaExceededError when saveWorkspaceTree fails with quota error", async () => {
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    await expect(createFolder("/", "new-folder")).rejects.toThrow(QuotaExceededError);
  });

  it("deleteFile throws QuotaExceededError when addToTrash fails with quota error", async () => {
    const entryWithMetadata = {
      ...defaultTree,
      tree: {
        ...defaultTree.tree,
        entries: [{ name: "test.md", path: "test.md", kind: "file" as const, metadata: { tags: {}, icon: "", favorite: false } }],
      },
    };
    mockGet.mockResolvedValueOnce(entryWithMetadata);
    mockGetFromIndex.mockResolvedValue(defaultFile);
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    await expect(deleteFile("/", "test.md")).rejects.toThrow(QuotaExceededError);
  });

  it("moveFile throws QuotaExceededError when putFile fails with quota error", async () => {
    mockGetFromIndex.mockResolvedValueOnce(defaultFileForMove);
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    await expect(moveFile("/", "source.md", "dest.md")).rejects.toThrow(QuotaExceededError);
  });

  it("updateEntryMetadata throws QuotaExceededError when saveWorkspaceTree fails with quota error", async () => {
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    await expect(updateEntryMetadata("/", "test.md", { favorite: true })).rejects.toThrow(
      QuotaExceededError
    );
  });

  it("saveWorkspaceTags throws QuotaExceededError when put fails with quota error", async () => {
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    await expect(saveWorkspaceTags("/", { tag: "color" })).rejects.toThrow(QuotaExceededError);
  });

  it("saveManualOrder throws QuotaExceededError when put fails with quota error", async () => {
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    await expect(saveManualOrder("/", "folder", ["a.md", "b.md"])).rejects.toThrow(
      QuotaExceededError
    );
  });

  it("restoreTrash throws QuotaExceededError when putFile fails with quota error", async () => {
    mockGet.mockResolvedValueOnce(trashItem);
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    await expect(restoreTrash("/", "trash-1")).rejects.toThrow(QuotaExceededError);
  });

  it("importWorkspace throws QuotaExceededError when trash put fails with quota error", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("workspace.json", JSON.stringify({
      tree: { name: "Notes", path: "/", entries: [], tags: {}, manualOrder: {} },
      files: [],
      trash: [{ id: "trash-1", path: "deleted.md", kind: "file", content: "deleted", deletedAt: Date.now(), restorable: true }],
      tags: {},
      manualOrder: {},
      exportedAt: Date.now(),
      version: 1,
    }));

    mockPut
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(QUOTA_ERROR);

    const blob = await zip.generateAsync({ type: "blob" });
    await expect(importWorkspace(blob)).rejects.toThrow(QuotaExceededError);
  });

  it("QuotaExceededError is identifiable by name and instanceof", async () => {
    mockGetFromIndex.mockResolvedValue(defaultFile);
    mockPut.mockRejectedValueOnce(QUOTA_ERROR);

    try {
      await writeFile("/", "test.md", "content", "old content");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(QuotaExceededError);
      expect((error as QuotaExceededError).name).toBe("QuotaExceededError");
    }
  });
});

describe("validateZipEntryPaths", () => {
  function createMockZip(files: Record<string, boolean>) {
    return {
      files: Object.fromEntries(
        Object.entries(files).map(([path, isDir]) => [
          path,
          { dir: isDir, async: vi.fn() },
        ])
      ),
    };
  }

  it("rejects directory traversal entries (../)", () => {
    const zip = createMockZip({
      "notes/test.md": false,
      "notes/../evil.md": false,
    });

    expect(() => validateZipEntryPaths(zip)).toThrow("Invalid path in archive");
  });

  it("rejects absolute paths in archive", () => {
    const zip = createMockZip({
      "notes/test.md": false,
      "/absolute.md": false,
    });

    expect(() => validateZipEntryPaths(zip)).toThrow("Invalid path in archive");
  });

  it("rejects Windows-style absolute paths", () => {
    const zip = createMockZip({
      "notes/test.md": false,
      "C:\\Windows\\evil.md": false,
    });

    expect(() => validateZipEntryPaths(zip)).toThrow("Invalid path in archive");
  });

  it("rejects paths with leading slash in notes/", () => {
    const zip = createMockZip({
      "notes/test.md": false,
      "notes//evil.md": false,
    });

    expect(() => validateZipEntryPaths(zip)).toThrow("Invalid path in archive");
  });

  it("accepts valid nested note paths", () => {
    const zip = createMockZip({
      "notes/folder/subfolder/note.md": false,
      "notes/another.md": false,
    });

    expect(() => validateZipEntryPaths(zip)).not.toThrow();
  });

  it("ignores directories", () => {
    const zip = createMockZip({
      "notes/test.md": false,
      "notes/folder/": true,
      "notes/../evil.md": false,
    });

    expect(() => validateZipEntryPaths(zip)).toThrow("Invalid path in archive");
  });

  it("normalizeWorkspacePath rejects traversal and absolute paths", () => {
    expect(normalizeWorkspacePath("../evil.md")).toBeNull();
    expect(normalizeWorkspacePath("folder/../../evil.md")).toBeNull();
    expect(normalizeWorkspacePath("/absolute.md")).toBeNull();
    expect(normalizeWorkspacePath("C:\\path.md")).toBeNull();
    expect(normalizeWorkspacePath("valid/path.md")).toBe("valid/path.md");
    expect(normalizeWorkspacePath("folder/subfolder/note.md")).toBe("folder/subfolder/note.md");
    expect(normalizeWorkspacePath("folder/../evil.md")).toBe("evil.md");
  });
});

describe("importWorkspace validation integration", () => {
  beforeEach(() => {
    setupBasicMocks();
  });

  it("does not clear or write workspace data on validation failure", async () => {
    const { validateZipEntryPaths } = await import("./workspace");
    const mockZip = {
      files: {
        "notes/test.md": { dir: false },
        "notes/../evil.md": { dir: false },
      },
    };

    try {
      validateZipEntryPaths(mockZip);
    } catch {
      // Expected to throw
    }

    expect(mockClear).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });
});

describe("downloadNoteAsMarkdown", () => {
  beforeEach(() => {
    setupBasicMocks();
  });

  it("returns note content as Markdown with .md filename", async () => {
    const markdownContent = "# Hello\n\nWorld";
    mockGetFromIndex.mockResolvedValueOnce({
      ...defaultFile,
      content: markdownContent,
    });

    const result = await downloadNoteAsMarkdown("/", "notes/hello.md");

    expect(result.content).toBe(markdownContent);
    expect(result.filename).toBe("hello.md");
  });

  it("adds .md extension when path has no extension", async () => {
    mockGetFromIndex.mockResolvedValueOnce({
      ...defaultFile,
      content: "content",
    });

    const result = await downloadNoteAsMarkdown("/", "notes/readme");

    expect(result.content).toBe("content");
    expect(result.filename).toBe("readme.md");
  });

  it("preserves .md extension when already present", async () => {
    mockGetFromIndex.mockResolvedValueOnce({
      ...defaultFile,
      content: "content",
    });

    const result = await downloadNoteAsMarkdown("/", "notes/document.md");

    expect(result.filename).toBe("document.md");
  });

  it("handles nested paths correctly", async () => {
    mockGetFromIndex.mockResolvedValueOnce({
      ...defaultFile,
      content: "nested content",
    });

    const result = await downloadNoteAsMarkdown("/", "folder/subfolder/note.txt");

    expect(result.content).toBe("nested content");
    expect(result.filename).toBe("note.txt.md");
  });

  it("throws when note not found", async () => {
    mockGetFromIndex.mockResolvedValueOnce(null);

    await expect(downloadNoteAsMarkdown("/", "missing.md")).rejects.toThrow("File not found");
  });

  it("does not modify workspace data (read-only operation)", async () => {
    mockGetFromIndex.mockResolvedValueOnce({
      ...defaultFile,
      content: "read only",
    });

    await downloadNoteAsMarkdown("/", "test.md");

    expect(mockPut).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("exportWorkspace and importWorkspace round trip", () => {
  beforeEach(() => {
    setupBasicMocks();
  });

  it("exports workspace data and imports it back with all content restored", async () => {
    const treeWithData = {
      ...defaultTree,
      tree: {
        name: "Notes",
        path: "/",
        entries: [
          { name: "note1.md", path: "note1.md", kind: "file" as const, isEmpty: false, modifiedMs: 1000, metadata: { tags: {}, icon: "", favorite: false } },
          { name: "folder", path: "folder", kind: "directory" as const, isEmpty: false, modifiedMs: 2000, children: [
            { name: "note2.md", path: "folder/note2.md", kind: "file" as const, isEmpty: false, modifiedMs: 3000, metadata: { tags: { work: "blue" }, icon: "", favorite: true } }
          ]}
        ],
        tags: { personal: "red", work: "blue" },
        manualOrder: { "/": ["note1.md", "folder"], "folder": ["note2.md"] },
      },
    };
    mockGet.mockResolvedValueOnce(treeWithData);
    mockGetAllFromIndex.mockResolvedValueOnce([
      { id: "/:note1.md", workspaceId: "/", path: "note1.md", content: "# Note 1\n\nContent one", modifiedMs: 1000 },
      { id: "/:folder/note2.md", workspaceId: "/", path: "folder/note2.md", content: "# Note 2\n\nContent two", modifiedMs: 3000 },
    ]);
    const trashItems = [
      { id: "trash-1", workspaceId: "/", path: "deleted.md", kind: "file" as const, content: "deleted content", metadata: { tags: {}, icon: "", favorite: false }, deletedAt: 4000, restorable: true },
    ];
    mockGetAllFromIndex.mockResolvedValueOnce(trashItems);
    const db = await (await import("idb")).openDB("test-db", 1);
    vi.mocked(db.getFromIndex).mockResolvedValueOnce({ id: "/:tags", workspaceId: "/", tags: { personal: "red", work: "blue" } });
    vi.mocked(db.getAllFromIndex).mockResolvedValueOnce([
      { id: "/:/", workspaceId: "/", parent: "/", paths: ["note1.md", "folder"] },
      { id: "/:folder", workspaceId: "/", parent: "folder", paths: ["note2.md"] },
    ]);

    const exportWorkspace = (await import("./workspace")).exportWorkspace;
    const blob = await exportWorkspace();

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);

    mockGet.mockResolvedValueOnce(defaultTree);
    mockGetAllFromIndex.mockResolvedValueOnce([]);
    mockGetFromIndex.mockResolvedValueOnce(null);
    mockPut.mockResolvedValue(undefined);
    mockTransaction.mockReturnValue({
      objectStore: mockObjectStore.mockReturnValue({ clear: mockClear }),
      done: Promise.resolve(),
    });

    const importWorkspace = (await import("./workspace")).importWorkspace;
    await importWorkspace(blob);

    expect(mockClear).toHaveBeenCalledTimes(5);
    expect(mockPut).toHaveBeenCalled();

    const workspacePutCalls = mockPut.mock.calls.filter(call => call[0] === "workspace");
    expect(workspacePutCalls.length).toBeGreaterThan(0);
    const savedTree = workspacePutCalls[0][1].tree;
    expect(savedTree.entries).toHaveLength(2);
    expect(savedTree.entries[0].path).toBe("note1.md");
    expect(savedTree.entries[1].path).toBe("folder");
    expect(savedTree.entries[1].children?.[0].path).toBe("folder/note2.md");
    expect(savedTree.tags).toEqual({ personal: "red", work: "blue" });
    expect(savedTree.manualOrder).toEqual({ "/": ["note1.md", "folder"], "folder": ["note2.md"] });

    const filePutCalls = mockPut.mock.calls.filter(call => call[0] === "files");
    expect(filePutCalls.length).toBe(2);
    expect(filePutCalls[0][1].path).toBe("note1.md");
    expect(filePutCalls[0][1].content).toBe("# Note 1\n\nContent one");
    expect(filePutCalls[1][1].path).toBe("folder/note2.md");
    expect(filePutCalls[1][1].content).toBe("# Note 2\n\nContent two");

    const trashPutCalls = mockPut.mock.calls.filter(call => call[0] === "trash");
    expect(trashPutCalls.length).toBe(1);
    expect(trashPutCalls[0][1].path).toBe("deleted.md");
    expect(trashPutCalls[0][1].content).toBeUndefined();
  });

  it("importWorkspace explicitly replaces existing workspace data by clearing all stores first", async () => {
    const existingTree = {
      ...defaultTree,
      tree: {
        name: "Notes",
        path: "/",
        entries: [
          { name: "old.md", path: "old.md", kind: "file" as const, isEmpty: false, modifiedMs: 1000, metadata: { tags: {}, icon: "", favorite: false } }
        ],
        tags: { old: "green" },
        manualOrder: { "/": ["old.md"] },
      },
    };
    mockGet.mockResolvedValueOnce(existingTree);
    mockGetAllFromIndex.mockResolvedValueOnce([
      { id: "/:old.md", workspaceId: "/", path: "old.md", content: "old content", modifiedMs: 1000 },
    ]);
    mockGetAllFromIndex.mockResolvedValueOnce([]);
    const db = await (await import("idb")).openDB("test-db", 1);
    vi.mocked(db.getFromIndex).mockResolvedValueOnce({ id: "/:tags", workspaceId: "/", tags: { old: "green" } });
    vi.mocked(db.getAllFromIndex).mockResolvedValueOnce([
      { id: "/:/", workspaceId: "/", parent: "/", paths: ["old.md"] },
    ]);

    const exportWorkspace = (await import("./workspace")).exportWorkspace;
    const blob = await exportWorkspace();

    mockGet.mockResolvedValueOnce(defaultTree);
    mockGetAllFromIndex.mockResolvedValueOnce([]);
    mockGetFromIndex.mockResolvedValueOnce(null);
    mockPut.mockResolvedValue(undefined);
    mockTransaction.mockReturnValue(createTransactionMock());

    const importWorkspace = (await import("./workspace")).importWorkspace;
    await importWorkspace(blob);

    expect(clearedStores).toHaveLength(5);
    expect(clearedStores).toEqual(expect.arrayContaining(["workspace", "files", "trash", "tags", "manualOrder"]));

    const workspacePutCalls = mockPut.mock.calls.filter(call => call[0] === "workspace");
    const savedTree = workspacePutCalls[0][1].tree;
    expect(savedTree.entries.find((e: { path: string }) => e.path === "old.md")).toBeDefined();
    expect(savedTree.tags).toEqual({ old: "green" });
  });
});

describe("importWorkspace unsafe archive path rejection", () => {
  beforeEach(() => {
    setupBasicMocks();
  });

  it("rejects traversal paths without modifying workspace data", async () => {
    const zip = { files: { "notes/../evil.md": { dir: false } } };
    const { validateZipEntryPaths } = await import("./workspace");

    expect(() => validateZipEntryPaths(zip)).toThrow("Invalid path in archive");
    expect(clearedStores).toEqual([]);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("rejects archive with absolute paths without modifying workspace", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("workspace.json", JSON.stringify({
      tree: { name: "Notes", path: "/", entries: [], tags: {}, manualOrder: {} },
      files: [],
      trash: [],
      tags: {},
      manualOrder: {},
      exportedAt: Date.now(),
      version: 1,
    }));
    zip.file("/absolute.md", "bad");

    const blob = await zip.generateAsync({ type: "blob" });

    const importWorkspace = (await import("./workspace")).importWorkspace;
    await expect(importWorkspace(blob)).rejects.toThrow("Invalid path in archive");

    expect(clearedStores).toEqual([]);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("rejects archive with Windows-style absolute paths without modifying workspace", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("workspace.json", JSON.stringify({
      tree: { name: "Notes", path: "/", entries: [], tags: {}, manualOrder: {} },
      files: [],
      trash: [],
      tags: {},
      manualOrder: {},
      exportedAt: Date.now(),
      version: 1,
    }));
    zip.file("C:\\Windows\\evil.md", "bad");

    const blob = await zip.generateAsync({ type: "blob" });

    const importWorkspace = (await import("./workspace")).importWorkspace;
    await expect(importWorkspace(blob)).rejects.toThrow("Invalid path in archive");

    expect(clearedStores).toEqual([]);
    expect(mockPut).not.toHaveBeenCalled();
  });

});
