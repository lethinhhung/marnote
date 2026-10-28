import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileTree } from "./FileTree";
import type { Entry } from "../workspaceTypes";

const entries: Entry[] = [
  { name: "Folder", path: "Folder", kind: "directory", children: [
    { name: "Active.md", path: "Folder/Active.md", kind: "file" },
  ] },
  { name: "Other.md", path: "Other.md", kind: "file" },
  { name: "Deep", path: "Deep", kind: "directory", children: [
    { name: "Nested.md", path: "Deep/Nested.md", kind: "file" },
  ] },
];

function renderTree(onMove: (source: string, destination: string) => Promise<boolean>) {
  return render(<FileTree
    entries={entries}
    manualOrder={{}}
    sort="name"
    selected=""
    selectedFolder=""
    focus="note"
    hideFoldersWithoutNotes={false}
    edit={null}
    onEditSubmit={vi.fn()}
    onEditCancel={vi.fn()}
    onOpen={vi.fn()}
    onFolderSelect={vi.fn()}
    onEntryContext={vi.fn()}
    onMove={onMove}
    onReorder={vi.fn()}
  />);
}

function item(path: string) {
  const button = document.querySelector<HTMLButtonElement>(`.tree-item[data-path="${path}"]`);
  if (!button) throw new Error(`Missing tree item ${path}`);
  return button;
}

/** Drag a tree item onto another tree item and resolve the drop target by path. */
function dragOnto(source: string, target: string) {
  document.elementFromPoint = vi.fn(() => item(target));
  fireEvent.pointerDown(item(source), { button: 0, clientX: 0, clientY: 0 });
  act(() => {
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 20, clientY: 20 }));
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 0, clientY: 0 }));
  });
}

describe("FileTree drag and drop", () => {
  beforeEach(() => {
    class FakePointerEvent extends MouseEvent {}
    (globalThis as { PointerEvent?: unknown }).PointerEvent = FakePointerEvent;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("moves a note next to a root-level note when dropped on it", () => {
    const onMove = vi.fn().mockResolvedValue(true);
    renderTree(onMove);

    dragOnto("Folder/Active.md", "Other.md");

    expect(onMove).toHaveBeenCalledWith("Folder/Active.md", "Active.md");
  });

  it("moves a note into the folder of a nested note when dropped on it", () => {
    const onMove = vi.fn().mockResolvedValue(true);
    renderTree(onMove);

    dragOnto("Folder/Active.md", "Deep/Nested.md");

    expect(onMove).toHaveBeenCalledWith("Folder/Active.md", "Deep/Active.md");
  });

  it("moves a folder into another folder when dropped on it", () => {
    const onMove = vi.fn().mockResolvedValue(true);
    renderTree(onMove);

    dragOnto("Deep", "Folder");

    expect(onMove).toHaveBeenCalledWith("Deep", "Folder/Deep");
  });

  it("rejects dropping a folder onto a note inside that folder", () => {
    const onMove = vi.fn().mockResolvedValue(true);
    renderTree(onMove);

    dragOnto("Folder", "Folder/Active.md");

    expect(onMove).not.toHaveBeenCalled();
  });
});
