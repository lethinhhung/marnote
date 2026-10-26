import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveDrafts } from "./resolveDrafts";
import { persistTabs } from "./noteTabStorage";

vi.mock("./noteTabStorage", () => ({
  persistTabs: vi.fn(),
}));

const mockPersistTabs = persistTabs as ReturnType<typeof vi.fn>;

const createArgs = (overrides: Partial<Parameters<typeof resolveDrafts>[0]> = {}) => ({
  paths: ["note1.md", "note2.md"],
  actions: { "note1.md": "save", "note2.md": "discard" } as Record<string, "save" | "discard">,
  treePath: "/workspace",
  tabs: ["note1.md", "note2.md"],
  active: "note1.md",
  drafts: { "note1.md": "draft content 1", "note2.md": "draft content 2" },
  originals: { "note1.md": "original content 1", "note2.md": "original content 2" },
  dirty: new Set(["note1.md", "note2.md"]),
  recent: ["note1.md", "note2.md"],
  save: vi.fn().mockResolvedValue(true),
  setDraft: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("resolveDrafts", () => {
  it("returns false when actions is null", async () => {
    const args = createArgs({ actions: null });
    const result = await resolveDrafts(args);
    expect(result).toBe(false);
    expect(args.save).not.toHaveBeenCalled();
    expect(mockPersistTabs).not.toHaveBeenCalled();
  });

  it("saves draft and updates originals on successful save", async () => {
    const args = createArgs({
      paths: ["note1.md"],
      actions: { "note1.md": "save" },
    });

    const result = await resolveDrafts(args);

    expect(result).toBe(true);
    expect(args.save).toHaveBeenCalledWith("note1.md", "draft content 1", "original content 1");
    expect(args.originals["note1.md"]).toBe("draft content 1");
    expect(args.dirty.has("note1.md")).toBe(false);
    expect(mockPersistTabs).toHaveBeenCalledWith(
      "/workspace",
      ["note1.md", "note2.md"],
      "note1.md",
      expect.objectContaining({ "note1.md": "draft content 1", "note2.md": "draft content 2" }),
      expect.objectContaining({ "note1.md": "draft content 1", "note2.md": "original content 2" }),
      expect.any(Set),
      ["note1.md", "note2.md"]
    );
  });

  it("discards draft and restores from originals", async () => {
    const args = createArgs({
      paths: ["note2.md"],
      actions: { "note2.md": "discard" },
    });

    const result = await resolveDrafts(args);

    expect(result).toBe(true);
    expect(args.save).not.toHaveBeenCalled();
    expect(args.drafts["note2.md"]).toBe("original content 2");
    expect(args.dirty.has("note2.md")).toBe(false);
    expect(mockPersistTabs).toHaveBeenCalled();
  });

  it("calls setDraft when discarding the active path", async () => {
    const args = createArgs({
      paths: ["note1.md"],
      actions: { "note1.md": "discard" },
      active: "note1.md",
    });

    const result = await resolveDrafts(args);

    expect(result).toBe(true);
    expect(args.setDraft).toHaveBeenCalledWith("original content 1");
  });

  it("does not call setDraft when discarding non-active path", async () => {
    const args = createArgs({
      paths: ["note2.md"],
      actions: { "note2.md": "discard" },
      active: "note1.md",
    });

    const result = await resolveDrafts(args);

    expect(result).toBe(true);
    expect(args.setDraft).not.toHaveBeenCalled();
  });

  it("does not call setDraft when active path has no original", async () => {
    const args = createArgs({
      paths: ["note1.md"],
      actions: { "note1.md": "discard" },
      active: "note1.md",
      originals: {},
    });

    const result = await resolveDrafts(args);

    expect(result).toBe(true);
    expect(args.setDraft).not.toHaveBeenCalled();
  });

  it("cleans dirty set on save", async () => {
    const args = createArgs({
      paths: ["note1.md", "note2.md"],
      actions: { "note1.md": "save", "note2.md": "save" },
      dirty: new Set(["note1.md", "note2.md"]),
    });

    await resolveDrafts(args);

    expect(args.dirty.has("note1.md")).toBe(false);
    expect(args.dirty.has("note2.md")).toBe(false);
  });

  it("cleans dirty set on discard", async () => {
    const args = createArgs({
      paths: ["note1.md", "note2.md"],
      actions: { "note1.md": "discard", "note2.md": "discard" },
      dirty: new Set(["note1.md", "note2.md"]),
    });

    await resolveDrafts(args);

    expect(args.dirty.has("note1.md")).toBe(false);
    expect(args.dirty.has("note2.md")).toBe(false);
  });

  it("persists tabs when treePath is provided", async () => {
    const args = createArgs({ treePath: "/workspace" });

    await resolveDrafts(args);

    expect(mockPersistTabs).toHaveBeenCalledWith(
      "/workspace",
      ["note1.md", "note2.md"],
      "note1.md",
      expect.any(Object),
      expect.any(Object),
      expect.any(Set),
      ["note1.md", "note2.md"]
    );
  });

  it("does not persist tabs when treePath is not provided", async () => {
    const args = createArgs({ treePath: undefined });

    await resolveDrafts(args);

    expect(mockPersistTabs).not.toHaveBeenCalled();
  });

  it("returns false and persists tabs on save failure", async () => {
    const args = createArgs({
      paths: ["note1.md"],
      actions: { "note1.md": "save" },
      save: vi.fn().mockResolvedValue(false),
    });

    const result = await resolveDrafts(args);

    expect(result).toBe(false);
    expect(args.save).toHaveBeenCalledWith("note1.md", "draft content 1", "original content 1");
    expect(mockPersistTabs).toHaveBeenCalled();
    expect(args.originals["note1.md"]).toBe("original content 1");
    expect(args.dirty.has("note1.md")).toBe(true);
  });

  it("returns false on save failure for first path and does not process remaining paths", async () => {
    const args = createArgs({
      paths: ["note1.md", "note2.md"],
      actions: { "note1.md": "save", "note2.md": "save" },
      save: vi.fn().mockResolvedValue(false),
    });

    const result = await resolveDrafts(args);

    expect(result).toBe(false);
    expect(args.save).toHaveBeenCalledTimes(1);
    expect(args.save).toHaveBeenCalledWith("note1.md", "draft content 1", "original content 1");
  });

  it("returns false when draft or original is missing for save action", async () => {
    const args = createArgs({
      paths: ["note1.md"],
      actions: { "note1.md": "save" },
      drafts: {},
      originals: {},
    });

    const result = await resolveDrafts(args);

    expect(result).toBe(false);
    expect(args.save).not.toHaveBeenCalled();
    expect(mockPersistTabs).toHaveBeenCalled();
  });

  it("processes multiple paths with mixed save and discard actions", async () => {
    const args = createArgs({
      paths: ["note1.md", "note2.md"],
      actions: { "note1.md": "save", "note2.md": "discard" },
    });

    const result = await resolveDrafts(args);

    expect(result).toBe(true);
    expect(args.save).toHaveBeenCalledTimes(1);
    expect(args.save).toHaveBeenCalledWith("note1.md", "draft content 1", "original content 1");
    expect(args.originals["note1.md"]).toBe("draft content 1");
    expect(args.drafts["note2.md"]).toBe("original content 2");
    expect(args.dirty.has("note1.md")).toBe(false);
    expect(args.dirty.has("note2.md")).toBe(false);
    // setDraft not called because active path (note1.md) was saved, not discarded
    expect(args.setDraft).not.toHaveBeenCalled();
  });
});