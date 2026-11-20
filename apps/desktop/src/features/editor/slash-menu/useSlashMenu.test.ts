import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { useSlashMenu } from "./useSlashMenu";
import { Schema } from "@tiptap/pm/model";
import { EditorState as PMEditorState, TextSelection } from "@tiptap/pm/state";

const testSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

function createMockEditor(text: string, parentOffset: number): Editor {
  const doc = testSchema.nodes.doc.create(null, testSchema.nodes.paragraph.create(null, testSchema.text(text)));
  const state = PMEditorState.create({ schema: testSchema, doc });
  const selection = TextSelection.create(doc, 1 + parentOffset, 1 + parentOffset);
  const stateWithSelection = state.apply(state.tr.setSelection(selection));

  return {
    state: stateWithSelection,
    view: {
      dom: document.createElement("div"),
      coordsAtPos: vi.fn(() => ({ top: 100, bottom: 120, left: 50 })),
    },
  } as unknown as Editor;
}

describe("useSlashMenu", () => {
  let editorRef: { current: Editor | null };

  beforeEach(() => {
    editorRef = { current: null };
  });

  it("shows slash menu when cursor is immediately after a slash command", () => {
    const { result } = renderHook(() => useSlashMenu({ editorRef }));
    const editor = createMockEditor("Hello /heading", 14);
    editorRef.current = editor;

    act(() => {
      result.current.handleEditorUpdate();
    });

    expect(result.current.slash).not.toBeNull();
    expect(result.current.slash?.query).toBe("heading");
  });

  it("shows slash menu for partial match at cursor position", () => {
    const { result } = renderHook(() => useSlashMenu({ editorRef }));
    const editor = createMockEditor("Hello /heading world", 9);
    editorRef.current = editor;

    act(() => {
      result.current.handleEditorUpdate();
    });

    expect(result.current.slash).not.toBeNull();
    expect(result.current.slash?.query).toBe("he");
  });

  it("does not show slash menu when paragraph ends with slash command but cursor is earlier", () => {
    const { result } = renderHook(() => useSlashMenu({ editorRef }));
    const editor = createMockEditor("Hello /heading world", 6);
    editorRef.current = editor;

    act(() => {
      result.current.handleEditorUpdate();
    });

    expect(result.current.slash).toBeNull();
  });

  it("shows slash menu for slash command at start of paragraph", () => {
    const { result } = renderHook(() => useSlashMenu({ editorRef }));
    const editor = createMockEditor("/bullet list", 7);
    editorRef.current = editor;

    act(() => {
      result.current.handleEditorUpdate();
    });

    expect(result.current.slash).not.toBeNull();
    expect(result.current.slash?.query).toBe("bullet");
  });

  it("does not show slash menu in non-paragraph nodes", () => {
    const { result } = renderHook(() => useSlashMenu({ editorRef }));
    const headingSchema = new Schema({
      nodes: {
        doc: { content: "block+" },
        heading: { group: "block", content: "inline*", attrs: { level: { default: 1 } } },
        text: { group: "inline" },
      },
    });
    const doc = headingSchema.nodes.doc.create(null, headingSchema.nodes.heading.create({ level: 1 }, headingSchema.text("/heading")));
    const state = PMEditorState.create({ schema: headingSchema, doc });
    const selection = TextSelection.create(doc, 10, 10);
    const stateWithSelection = state.apply(state.tr.setSelection(selection));

    const editor = {
      state: stateWithSelection,
      view: { dom: document.createElement("div"), coordsAtPos: vi.fn(() => ({ top: 100, bottom: 120, left: 50 })) },
    } as unknown as Editor;
    editorRef.current = editor;

    act(() => {
      result.current.handleEditorUpdate();
    });

    expect(result.current.slash).toBeNull();
  });
});