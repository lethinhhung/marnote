import { describe, expect, it, vi } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { getBlockDropTarget, moveTopLevelBlock } from "./blockDnd";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    text: {},
  },
});

function buildState(labels: string[]) {
  const doc = schema.node(
    "doc",
    null,
    labels.map((label) => schema.node("paragraph", null, [schema.text(label)])),
  );
  return EditorState.create({ doc });
}

function blockElement(top: number, height: number) {
  const element = document.createElement("div");
  element.getBoundingClientRect = () =>
    ({
      top,
      bottom: top + height,
      height,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  return element;
}

function dropView(labels: string[], bounds: [number, number][]) {
  const state = buildState(labels);
  const elements = bounds.map(([top, height]) => blockElement(top, height));
  const byPosition = new Map<number, HTMLElement>();
  let position = 0;
  state.doc.forEach((node, _offset, index) => {
    byPosition.set(position, elements[index]);
    position += node.nodeSize;
  });
  const dom = blockElement(0, 0);
  dom.getBoundingClientRect = () => ({ top: 0, bottom: 500 }) as DOMRect;
  return {
    state,
    dom,
    nodeDOM: (pos: number) => byPosition.get(pos) ?? null,
  } as unknown as EditorView;
}

const bounds: [number, number][] = [
  [0, 100],
  [100, 100],
  [200, 100],
];

describe("getBlockDropTarget", () => {
  it("targets before a block when the pointer is above its midpoint", () => {
    expect(getBlockDropTarget(dropView(["one", "two", "three"], bounds), 40)).toEqual({
      position: 0,
      lineY: 0,
    });
  });

  it("targets after a middle block when the pointer is below its midpoint", () => {
    expect(getBlockDropTarget(dropView(["one", "two", "three"], bounds), 120)).toEqual({
      position: 5,
      lineY: 100,
    });
  });

  it("targets the document end when the pointer is below the last block", () => {
    expect(getBlockDropTarget(dropView(["one", "two", "three"], bounds), 260)).toEqual({
      position: 17,
      lineY: 300,
    });
  });
});

function moveView(labels: string[]) {
  const dispatch = vi.fn();
  const view = { state: buildState(labels), dispatch } as unknown as EditorView;
  return { view, dispatch };
}

function textsOf(doc: { childCount: number; child: (index: number) => { textContent: string } }) {
  return Array.from({ length: doc.childCount }, (_, index) => doc.child(index).textContent);
}

describe("moveTopLevelBlock", () => {
  it("moves a top-level block to a later destination", () => {
    const { view, dispatch } = moveView(["one", "two", "three"]);
    moveTopLevelBlock(view, 0, 17);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(textsOf(dispatch.mock.calls[0][0].doc)).toEqual(["two", "three", "one"]);
  });

  it("moves a top-level block to an earlier destination", () => {
    const { view, dispatch } = moveView(["one", "two", "three"]);
    moveTopLevelBlock(view, 10, 0);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(textsOf(dispatch.mock.calls[0][0].doc)).toEqual(["three", "one", "two"]);
  });

  it("does nothing when the destination is inside the source block", () => {
    const { view, dispatch } = moveView(["one", "two"]);
    moveTopLevelBlock(view, 0, 2);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
