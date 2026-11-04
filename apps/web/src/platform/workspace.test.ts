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
  importWorkspace,
  moveFile,
  restoreTrash,
  saveManualOrder,
  saveWorkspaceTags,
  updateEntryMetadata,
  writeFile,
} from "./workspace";

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