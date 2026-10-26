import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { TableEdgeControls } from "./TableEdgeControls";

function makeEditor() {
  const run = vi.fn();
  const addRowAfter = vi.fn(() => ({ run }));
  const addColumnAfter = vi.fn(() => ({ run }));
  const setTextSelection = vi.fn(() => ({ addRowAfter, addColumnAfter }));
  const focus = vi.fn(() => ({ setTextSelection }));
  const editor = {
    on: vi.fn(),
    off: vi.fn(),
    view: { posAtCoords: vi.fn(() => ({ pos: 7 })) },
    chain: vi.fn(() => ({ focus })),
  } as unknown as Editor;
  return { editor, run, addRowAfter, addColumnAfter, setTextSelection };
}

function bounds(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, right: left + width, bottom: top + height, width, height, x: left, y: top, toJSON: () => ({}) };
}

function setupTable(editor: ReturnType<typeof makeEditor>["editor"], resizeEnabled = false) {
  const { container } = render(
    <TableEdgeControls editor={editor} resizeEnabled={resizeEnabled}>
      <div className="tableWrapper"><table><tbody><tr><td>Cell</td></tr></tbody></table></div>
    </TableEdgeControls>,
  );
  const wrapper = container.querySelector<HTMLElement>(".tableWrapper")!;
  const table = container.querySelector("table")!;
  const cell = container.querySelector("td")!;
  wrapper.getBoundingClientRect = () => bounds(10, 20, 200, 100);
  Object.defineProperty(wrapper, "clientWidth", { value: 200 });
  table.getBoundingClientRect = () => bounds(10, 20, 200, 40);
  cell.getBoundingClientRect = () => bounds(10, 20, 100, 30);
  return { container, wrapper, table, cell };
}

describe("TableEdgeControls", () => {
  it("adds a row after the last row of a hovered table", () => {
    const { editor, run, addRowAfter, setTextSelection } = makeEditor();
    setupTable(editor);
    fireEvent.pointerOver(screen.getByRole("table"));
    fireEvent.click(screen.getByRole("button", { name: "Add row to table" }));

    expect(editor.view.posAtCoords).toHaveBeenCalledWith({ left: 18, top: 28 });
    expect(editor.chain).toHaveBeenCalledOnce();
    expect(setTextSelection).toHaveBeenCalledWith(7);
    expect(addRowAfter).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledOnce();
  });

  it("adds a column after the last column of a hovered table", () => {
    const { editor, run, addColumnAfter, setTextSelection } = makeEditor();
    setupTable(editor);
    fireEvent.pointerOver(screen.getByRole("table"));
    fireEvent.click(screen.getByRole("button", { name: "Add column to table" }));

    expect(editor.view.posAtCoords).toHaveBeenCalled();
    expect(editor.chain).toHaveBeenCalledOnce();
    expect(setTextSelection).toHaveBeenCalled();
    expect(addColumnAfter).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledOnce();
  });

  it("shows add row and column buttons on hover", () => {
    const { editor } = makeEditor();
    setupTable(editor);
    fireEvent.pointerOver(screen.getByRole("table"));
    expect(screen.getByRole("button", { name: "Add row to table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add column to table" })).toBeInTheDocument();
  });

  it("hides add buttons on pointer leave", () => {
    const { editor } = makeEditor();
    setupTable(editor);
    fireEvent.pointerOver(screen.getByRole("table"));
    fireEvent.pointerLeave(screen.getByRole("table"));
    expect(screen.queryByRole("button", { name: "Add row to table" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add column to table" })).not.toBeInTheDocument();
  });

  it("does not show resize controls when resizeEnabled is false", () => {
    const { editor } = makeEditor();
    setupTable(editor, false);
    fireEvent.pointerOver(screen.getByRole("table"));
    // Resize handle buttons should not be present when resizeEnabled is false
    expect(screen.queryByRole("button", { name: /resize/i })).not.toBeInTheDocument();
  });
});