import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { useEditorEmoji } from "./useEditorEmoji";

function editorFor(text: string) {
  const insertContentAt = vi.fn();
  const setTextSelection = vi.fn();
  const run = vi.fn();
  const commands = { insertContentAt, setTextSelection, focus: () => commands, run };
  insertContentAt.mockReturnValue(commands);
  setTextSelection.mockReturnValue(commands);
  const chain = vi.fn(() => commands);
  const editor = { state: { selection: { empty: true, $from: { parent: { type: { name: "paragraph" }, textContent: text }, parentOffset: text.length, pos: text.length + 1 } } }, view: { coordsAtPos: () => ({ bottom: 20, left: 30 }) }, chain } as unknown as Editor;
  return { editor, insertContentAt, setTextSelection, run };
}

describe("useEditorEmoji", () => {
  it("suggests matching names and replaces the shortcode when chosen", () => {
    const mock = editorFor("hello :smi");
    const { result } = renderHook(() => useEditorEmoji({ editorRef: { current: mock.editor } }));
    act(() => result.current.update());
    expect(result.current.menu?.query).toBe("smi");
    expect(result.current.matches).toContain("smile");
    act(() => result.current.choose("smile"));
    expect(mock.insertContentAt).toHaveBeenCalledWith({ from: 7, to: 11 }, "😄");
    expect(result.current.menu).toBeNull();
  });

  it("converts a completed shortcode and leaves unknown names alone", () => {
    const mock = editorFor(":heart:");
    const { result } = renderHook(() => useEditorEmoji({ editorRef: { current: mock.editor } }));
    act(() => result.current.update());
    expect(mock.insertContentAt).toHaveBeenCalledWith({ from: 1, to: 8 }, "❤️");
    expect(result.current.menu).toBeNull();
    const unknown = editorFor(":not_a_shortcode:");
    const next = renderHook(() => useEditorEmoji({ editorRef: { current: unknown.editor } }));
    act(() => next.result.current.update());
    expect(unknown.insertContentAt).not.toHaveBeenCalled();
  });
});
