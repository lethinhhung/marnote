import { Schema, type Node } from "@tiptap/pm/model";
import { EditorState, TextSelection, type Transaction } from "@tiptap/pm/state";
import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { setColumnAlignment } from "./tableAlignment";

const schema = new Schema({
  topNode: "doc",
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    table: { content: "tableRow+", group: "block", tableRole: "table" },
    tableRow: { content: "tableCell+", tableRole: "row" },
    tableCell: {
      content: "block+", tableRole: "cell",
      attrs: { align: { default: null } },
    },
  },
});

function tableDoc(firstAlignment: string | null = null): Node {
  const cell = (value: string, align: string | null = null) => schema.nodes.tableCell.create(
    { align }, schema.nodes.paragraph.create(null, schema.text(value)),
  );
  const rows = [[cell("a", firstAlignment), cell("b")], [cell("c"), cell("d")]]
    .map((cells) => schema.nodes.tableRow.create(null, cells));
  return schema.nodes.doc.create(null, schema.nodes.table.create(null, rows));
}

function tableDocWithColumnAligned(columnAlignments: (string | null)[]): Node {
  const cell = (value: string, align: string | null = null) => schema.nodes.tableCell.create(
    { align }, schema.nodes.paragraph.create(null, schema.text(value)),
  );
  const rows = [
    [cell("a", columnAlignments[0]), cell("b", columnAlignments[1])],
    [cell("c", columnAlignments[0]), cell("d", columnAlignments[1])],
  ].map((cells) => schema.nodes.tableRow.create(null, cells));
  return schema.nodes.doc.create(null, schema.nodes.table.create(null, rows));
}

function createEditorState(doc: Node) {
  const base = EditorState.create({ schema, doc });
  // Find position inside the first cell's text content
  // doc(1) -> table(1) -> tableRow(1) -> tableCell(1) -> paragraph(1) -> text
  // Position 5 is inside the text node "a"
  const textPos = 5;
  const state = base.apply(base.tr.setSelection(TextSelection.create(doc, textPos)));
  const dispatch = vi.fn<(transaction: Transaction) => void>();
  return { editor: { state, view: { dispatch } } as unknown as Editor, dispatch };
}

function setup(doc = tableDoc()) {
  return createEditorState(doc);
}

function alignments(transaction: Transaction): (string | null)[] {
  const result: (string | null)[] = [];
  transaction.doc.firstChild?.forEach((row) => row.forEach((cell) => result.push(cell.attrs.align)));
  return result;
}

describe("setColumnAlignment", () => {
  it("updates each cell in the current column and dispatches the transaction", () => {
    const { editor, dispatch } = setup();

    expect(setColumnAlignment(editor, "center")).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(alignments(dispatch.mock.calls[0][0])).toEqual(["center", null, "center", null]);
  });

  it("does not dispatch when the requested alignment makes no document change", () => {
    const dispatch = vi.fn<(transaction: Transaction) => void>();
    // Both cells in column 0 already have "left" alignment
    const doc = tableDocWithColumnAligned(["left", null]);
    const { editor } = createEditorState(doc);
    editor.view.dispatch = dispatch;

    // Mock the transaction to have docChanged = false
    const mockTr = {
      docChanged: false,
      setNodeMarkup: vi.fn(),
    } as unknown as Transaction;
    vi.spyOn(editor.state, "tr", "get").mockReturnValue(mockTr);

    expect(setColumnAlignment(editor, "left")).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
