import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";

vi.mock("@tiptap/extension-drag-handle-react", () => ({
  DragHandle: ({ children, onNodeChange }: { children: React.ReactNode; onNodeChange: (event: { pos: number }) => void }) => {
    onNodeChange({ pos: 0 });
    return <div className="block-drag-handle">{children}</div>;
  },
}));

import { BlockDragHandle } from "./BlockDragHandle";

const schema = new Schema({ nodes: { doc: { content: "block+" }, paragraph: { group: "block", content: "text*" }, text: {} } });

function makeEditor() {
  const doc = schema.node("doc", null, ["one", "two"].map((label) => schema.node("paragraph", null, [schema.text(label)])));
  const state = EditorState.create({ doc });
  const nodes = [document.createElement("p"), document.createElement("p")];
  nodes.forEach((node, index) => {
    node.getBoundingClientRect = () => ({ top: index * 100, bottom: (index + 1) * 100, height: 100 }) as DOMRect;
  });
  const dom = document.createElement("div");
  dom.getBoundingClientRect = () => ({ top: 0, bottom: 200 }) as DOMRect;
  const dispatch = vi.fn();
  const view = { state, dom, dispatch, nodeDOM: (pos: number) => nodes[pos === 0 ? 0 : 1] } as unknown as EditorView;
  return { state, dispatch, editor: { view, state } as unknown as Editor };
}

afterEach(() => { cleanup(); delete document.body.dataset.blockDragging; });

describe("BlockDragHandle", () => {
  it("renders its drag control in the editor", () => {
    const { editor } = makeEditor();
    render(<BlockDragHandle editor={editor} />);
    expect(screen.getByRole("button", { name: "Drag block to move" })).toHaveAttribute("title", "Drag to move block");
  });

  it("starts a pointer drag and dispatches a block move on drop", () => {
    const { editor, dispatch } = makeEditor();
    render(<BlockDragHandle editor={editor} />);
    const button = screen.getByRole("button", { name: "Drag block to move" });
    button.setPointerCapture = vi.fn();
    fireEvent.pointerDown(button, { pointerId: 1, clientX: 5, clientY: 5 });
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 20, clientY: 150 });
    expect(document.body).toHaveAttribute("data-block-dragging", "true");
    expect(button).toHaveClass("is-dragging");
    fireEvent.pointerUp(button, { pointerId: 1, clientX: 20, clientY: 150 });
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch.mock.calls[0][0].doc.textContent).toBe("twoone");
    expect(dispatch.mock.calls[1][0].getMeta("hideDragHandle")).toBe(true);
    expect(document.body).not.toHaveAttribute("data-block-dragging");
  });
});
