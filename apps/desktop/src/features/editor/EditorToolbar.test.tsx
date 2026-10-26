import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { setParagraph, toggleBold, insertTable, setTextSelection } = vi.hoisted(() => {
  const calls = { setParagraph: vi.fn(), toggleBold: vi.fn(), insertTable: vi.fn(), setTextSelection: vi.fn() };
  return calls;
});

vi.mock("@tiptap/react", () => ({
  useEditorState: ({ editor, selector }: { editor: unknown; selector: (state: { editor: unknown }) => unknown }) => selector({ editor }),
}));
vi.mock("./LinkDialog", () => ({
  LinkDialog: ({ initialHref }: { initialHref: string }) => <div role="dialog">Link dialog: {initialHref}</div>,
}));
vi.mock("./WorkspaceLinkPalette", () => ({ WorkspaceLinkPalette: () => <div role="dialog">Workspace links</div> }));

import { EditorToolbar } from "./EditorToolbar";

function makeEditor() {
  const chain = { focus: vi.fn(), setParagraph, toggleBold, insertTable, setTextSelection, run: vi.fn(() => true) };
  for (const method of [chain.focus, setParagraph, toggleBold, insertTable, setTextSelection]) method.mockImplementation(() => chain);
  for (const method of ["toggleHeading", "toggleItalic", "toggleStrike", "toggleCode", "toggleCodeBlock", "toggleBulletList", "toggleOrderedList", "toggleTaskList", "toggleBlockquote", "setHorizontalRule"]) {
    Object.assign(chain, { [method]: vi.fn(() => chain) });
  }
  for (const method of ["addRowAfter", "addColumnAfter", "deleteRow", "deleteColumn", "toggleHeaderRow", "deleteTable"]) {
    Object.assign(chain, { [method]: vi.fn(() => chain) });
  }
  return {
    chain: vi.fn(() => chain), isActive: vi.fn(() => false), on: vi.fn(), off: vi.fn(),
    state: { selection: { from: 2, to: 5 }, doc: { textBetween: vi.fn(() => "text") } },
    getAttributes: vi.fn(() => ({})),
  };
}

describe("EditorToolbar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs formatting and table actions, and enables saving when dirty", () => {
    const editor = makeEditor();
    const onSave = vi.fn();
    render(<EditorToolbar editor={editor as never} source={false} horizontalScroll={false} onToggleHorizontalScroll={vi.fn()} onSave={onSave} dirty saving={false} path="note.md" entries={[]} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Bold" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Insert table" }));
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(toggleBold).toHaveBeenCalledOnce();
    expect(insertTable).toHaveBeenCalledWith({ rows: 3, cols: 3, withHeaderRow: true });
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("opens the web link dialog for the link edit custom event", () => {
    const editor = makeEditor();
    render(<EditorToolbar editor={editor as never} source={false} horizontalScroll={false} onToggleHorizontalScroll={vi.fn()} onSave={vi.fn()} dirty={false} saving={false} path="note.md" entries={[]} />);

    fireEvent(document, new CustomEvent("marnote-edit-link", { detail: { href: "https://example.com", text: "Example", from: 1, to: 4 } }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Link dialog: https://example.com");
  });
});
