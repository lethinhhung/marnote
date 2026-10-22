import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTreeDragDrop } from "./useTreeDragDrop";
import type { ExplorerSort } from "./sortEntries";
import type { Entry } from "./workspaceTypes";

class FakePointerEvent extends MouseEvent {}
(globalThis as { PointerEvent?: unknown }).PointerEvent = FakePointerEvent;

const nestedEntries: Entry[] = [
  { name: "Folder", path: "Folder", kind: "directory", children: [{ name: "Active.md", path: "Folder/Active.md", kind: "file" }] },
  { name: "Other.md", path: "Other.md", kind: "file" },
  { name: "Deep", path: "Deep", kind: "directory", children: [{ name: "Nested.md", path: "Deep/Nested.md", kind: "file" }] },
];

const siblingEntries: Entry[] = [{ name: "A.md", path: "A.md", kind: "file" }, { name: "B.md", path: "B.md", kind: "file" }];

type DragResult = { current: ReturnType<typeof useTreeDragDrop> };

function mountTreeDom(items: Array<{ path: string; kind: string }>) {
  document.body.innerHTML = `<ul class="file-tree">${items.map(item => `<li><button class="tree-item" data-kind="${item.kind}" data-path="${item.path}"></button></li>`).join("")}</ul>`;
  const tree = document.querySelector(".file-tree") as HTMLElement;
  tree.getBoundingClientRect = () => ({ left: 0, top: 0, right: 200, bottom: 400, width: 200, height: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
}

function item(path: string) {
  const button = document.querySelector<HTMLButtonElement>(`.tree-item[data-path="${path}"]`);
  if (!button) throw new Error(`Missing tree item ${path}`);
  return button;
}

function renderDragDrop(entries: Entry[], sort: ExplorerSort) {
  const onMove = vi.fn().mockResolvedValue(true);
  const onReorder = vi.fn().mockResolvedValue(true);
  const setExpanded = vi.fn();
  const hook = renderHook(() => useTreeDragDrop({ entries, sort, setExpanded, onMove, onReorder }));
  return { ...hook, onMove, onReorder, setExpanded };
}

async function drag(result: DragResult, source: string, target: string | null, end = { clientX: 20, clientY: 20 }) {
  document.elementFromPoint = vi.fn(() => (target ? item(target) : null));
  act(() => { result.current.start(source, { button: 0, clientX: 0, clientY: 0 }); });
  await act(async () => {
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 20, clientY: 20 }));
    window.dispatchEvent(new PointerEvent("pointerup", end));
  });
}

describe("useTreeDragDrop", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("moves a note into the folder of the note it is dropped on", async () => {
    mountTreeDom([{ path: "Other.md", kind: "file" }, { path: "Deep/Nested.md", kind: "file" }]);
    const { result, onMove } = renderDragDrop(nestedEntries, "name");

    await drag(result, "Folder/Active.md", "Deep/Nested.md");

    expect(onMove).toHaveBeenCalledWith("Folder/Active.md", "Deep/Active.md");
  });

  it("moves a note to the workspace root when dropped on blank tree space", async () => {
    mountTreeDom([{ path: "Other.md", kind: "file" }]);
    const { result, onMove } = renderDragDrop(nestedEntries, "name");

    await drag(result, "Folder/Active.md", null);

    expect(onMove).toHaveBeenCalledWith("Folder/Active.md", "Active.md");
  });

  it("reorders siblings when manual order is active", async () => {
    mountTreeDom([{ path: "A.md", kind: "file" }, { path: "B.md", kind: "file" }]);
    const { result, onReorder, onMove } = renderDragDrop(siblingEntries, "manual");

    await drag(result, "A.md", "B.md");

    expect(onReorder).toHaveBeenCalledWith("", ["B.md", "A.md"]);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("ignores a drop released outside the tree", async () => {
    mountTreeDom([{ path: "Other.md", kind: "file" }]);
    const { result, onMove } = renderDragDrop(nestedEntries, "name");

    await drag(result, "Folder/Active.md", "Other.md", { clientX: 500, clientY: 500 });

    expect(onMove).not.toHaveBeenCalled();
  });

  it("undoes the last move with Ctrl+Z", async () => {
    mountTreeDom([{ path: "Deep/Nested.md", kind: "file" }]);
    const { result, onMove } = renderDragDrop(nestedEntries, "name");

    await drag(result, "Folder/Active.md", "Deep/Nested.md");
    expect(onMove).toHaveBeenCalledWith("Folder/Active.md", "Deep/Active.md");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
    });

    expect(onMove).toHaveBeenLastCalledWith("Deep/Active.md", "Folder/Active.md");
  });

  it("reports the dragged path and drop target while dragging", async () => {
    mountTreeDom([{ path: "Deep/Nested.md", kind: "file" }]);
    const { result } = renderDragDrop(nestedEntries, "name");

    document.elementFromPoint = vi.fn(() => item("Deep/Nested.md"));
    act(() => { result.current.start("Folder/Active.md", { button: 0, clientX: 0, clientY: 0 }); });
    await act(async () => { window.dispatchEvent(new PointerEvent("pointermove", { clientX: 20, clientY: 20 })); });

    expect(result.current.dragging).toBe("Folder/Active.md");
    expect(result.current.dropTarget).toBe("Deep/Nested.md");
  });
});
