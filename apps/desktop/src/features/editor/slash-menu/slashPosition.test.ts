import { afterEach, describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { slashPosition } from "./slashPosition";

const originalInnerHeight = window.innerHeight;
const originalInnerWidth = window.innerWidth;

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

function mockEditor(coords: { top: number; bottom: number; left: number }): Editor {
  return {
    view: { coordsAtPos: vi.fn(() => coords) },
  } as unknown as Editor;
}

afterEach(() => setViewport(originalInnerWidth, originalInnerHeight));

describe("slashPosition", () => {
  it("places the menu below when there is more room below the cursor", () => {
    setViewport(900, 600);
    const editor = mockEditor({ top: 200, bottom: 220, left: 120 });

    expect(slashPosition(editor, 4, "heading")).toEqual({
      top: 226,
      left: 120,
      maxHeight: 340,
    });
    expect(editor.view.coordsAtPos).toHaveBeenCalledWith(4);
  });

  it("places the menu above and sizes it from matching slash ids", () => {
    setViewport(900, 600);
    const editor = mockEditor({ top: 500, bottom: 520, left: 120 });

    expect(slashPosition(editor, 7, "heading")).toEqual({
      top: 319,
      left: 120,
      maxHeight: 340,
    });
  });

  it("uses the smaller menu height when the query has no matches", () => {
    setViewport(900, 600);
    const editor = mockEditor({ top: 200, bottom: 220, left: 120 });

    expect(slashPosition(editor, 1, "no-such-command")).toEqual({
      top: 226,
      left: 120,
      maxHeight: 340,
    });
  });
});
