import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TreeRow } from "./TreeRow";
import type { Entry } from "../workspaceTypes";

const note: Entry = { name: "Note.md", path: "Note.md", kind: "file", metadata: { icon: "✨", tags: ["work"], favorite: true } };
const child: Entry = { name: "Child.md", path: "Folder/Child.md", kind: "file" };
const folder: Entry = { name: "Folder", path: "Folder", kind: "directory", children: [child], metadata: { tags: ["project"], favorite: true, createdMs: 1704067200000, updatedMs: 1704153600000 } };

function renderRow(entry: Entry, overrides: Record<string, unknown> = {}) {
  const props = {
    entry, selected: "", selectedFolder: "", focus: "none" as const, dragging: "", dropTarget: "", focusPath: "",
    expanded: new Set<string>(), onExpanded: vi.fn(), depth: 0, onStart: vi.fn(), onClick: vi.fn(),
    onEntryContext: vi.fn(), edit: null, onEditSubmit: vi.fn(), onEditCancel: vi.fn(), tagColors: {}, ...overrides,
  };
  return { ...render(<TreeRow {...props} />), props };
}

afterEach(cleanup);

describe("TreeRow", () => {
  it("shows selection state, metadata, and dispatches primary pointer and click actions", () => {
    const { props } = renderRow(note, { selected: note.path, focus: "note" });
    const button = screen.getByRole("button", { name: "Note.md" });
    expect(button).toHaveClass("selected");
    expect(within(button).getByText("✨")).toBeInTheDocument();
    expect(within(button).getByText("#work")).toBeInTheDocument();
    expect(within(button).getByTestId("tree-favorite")).toBeInTheDocument();
    fireEvent(button, new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
    fireEvent.click(button);
    expect(props.onStart).toHaveBeenCalledWith(note.path, expect.anything());
    expect(props.onClick).toHaveBeenCalledWith(note);
  });

  it("expands/collapses folders and renders folder metadata", () => {
    const { props } = renderRow(folder, { selectedFolder: folder.path, focus: "folder" });
    const button = screen.getByRole("button", { name: "Folder" });
    expect(button).toHaveClass("selected-folder");
    expect(within(button).getByText("#project")).toBeInTheDocument();
    expect(within(button).getAllByText(/2024/)).toHaveLength(2);
    fireEvent.click(button);
    expect(props.onExpanded).toHaveBeenCalled();
    const updater = props.onExpanded.mock.calls[0][0];
    expect([...updater(new Set())]).toEqual([folder.path]);
    renderRow(folder, { expanded: new Set([folder.path]) });
    expect(screen.getByRole("button", { name: "Child.md" })).toBeInTheDocument();
  });

  it("opens the context menu from pointer and keyboard commands", () => {
    const { props } = renderRow(note);
    const button = screen.getByRole("button", { name: "Note.md" });
    fireEvent.contextMenu(button, { clientX: 42, clientY: 73 });
    expect(props.onEntryContext).toHaveBeenLastCalledWith(note.path, "note", 42, 73);
    button.getBoundingClientRect = () => ({ left: 8, bottom: 29 } as DOMRect);
    fireEvent.keyDown(button, { key: "F10", shiftKey: true });
    expect(props.onEntryContext).toHaveBeenLastCalledWith(note.path, "note", 8, 29);
    fireEvent.keyDown(button, { key: "ContextMenu" });
    expect(props.onEntryContext).toHaveBeenLastCalledWith(note.path, "note", 8, 29);
  });

  it("renders inline editing and forwards submit, Escape, and cancel actions", () => {
    const { props } = renderRow(note, { edit: { path: note.path, value: "Draft", kind: "note" } });
    const input = screen.getByRole("textbox", { name: "Note name" });
    expect(input).toHaveValue("Draft");
    fireEvent.change(input, { target: { value: "  Renamed  " } });
    fireEvent.submit(input.closest("form")!);
    expect(props.onEditSubmit).toHaveBeenCalledWith("Renamed");
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onEditCancel).toHaveBeenCalledTimes(2);
  });
});
