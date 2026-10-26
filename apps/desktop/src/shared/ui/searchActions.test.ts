import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSearchActions } from "./searchActions";
import type { Entry, WorkspaceTree } from "../domain/workspace";
import { relativeWorkspaceLink } from "../../features/editor/workspaceLinks";
import { uniqueCreatePath } from "../../features/workspace/uniqueCreatePath";

vi.mock("../../features/editor/workspaceLinks", () => ({
  relativeWorkspaceLink: vi.fn(() => "../Target.md"),
}));
vi.mock("../../features/workspace/uniqueCreatePath", () => ({
  uniqueCreatePath: vi.fn((_entries: Entry[], path: string) => `Notes/${path}`),
}));

const note: Entry = { name: "Target.md", path: "Notes/Target.md", kind: "file" };
const tree: WorkspaceTree = { name: "Workspace", path: "/workspace", entries: [note] };
const writeText = vi.fn<() => Promise<void>>();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  writeText.mockResolvedValue(undefined);
});

describe("createSearchActions", () => {
  it("creates a note only after the current note saves successfully", async () => {
    const save = vi.fn().mockResolvedValue(false);
    const create = vi.fn();
    const actions = createSearchActions(tree, "Notes/Current.md", "Current", save, create);

    await actions.createNote("Draft");
    expect(save).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();

    save.mockResolvedValue(true);
    await actions.createNote("Draft");
    expect(uniqueCreatePath).toHaveBeenCalledWith(tree.entries, "Draft.md");
    expect(create).toHaveBeenCalledWith("Notes/Draft.md");
  });

  it("copies a target's relative path and note content", async () => {
    const actions = createSearchActions(tree, "Notes/Current.md", "Current", async () => true, async () => {});

    await actions.copyTarget(note, "relative-path");
    await actions.copyTarget(note, "content", "Note body");

    expect(writeText.mock.calls).toEqual([["Notes/Target.md"], ["Note body"]]);
  });

  it("copies an internal link using the workspace link helper", async () => {
    const actions = createSearchActions(tree, "Notes/Current.md", "Current", async () => true, async () => {});

    await actions.copyTarget(note, "link");

    expect(relativeWorkspaceLink).toHaveBeenCalledWith("Notes/Current.md", note);
    expect(writeText).toHaveBeenCalledWith("[Target](../Target.md)");
  });
});
