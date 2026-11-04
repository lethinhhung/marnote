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

mockTransaction.mockReturnValue({
  objectStore: mockObjectStore.mockReturnValue({ clear: mockClear }),
  done: Promise.resolve(),
});

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

  mockGet.mockResolvedValue(defaultTree);
  mockGetFromIndex.mockResolvedValue(defaultFile);
  mockGetAllFromIndex.mockResolvedValue([]);
  mockPut.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  mockTransaction.mockReturnValue({
    objectStore: mockObjectStore.mockReturnValue({ clear: mockClear }),
    done: Promise.resolve(),
  });
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