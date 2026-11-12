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
      attrs: { align: { default: null }, rowspan: { default: 1 }, colspan: { default: 1 } },
    },
  },
});

function createEditorState(doc: Node, textPos: number) {
  const base = EditorState.create({ schema, doc });
  const state = base.apply(base.tr.setSelection(TextSelection.create(doc, textPos)));
  const dispatch = vi.fn<(transaction: Transaction) => void>();
  return { editor: { state, view: { dispatch } } as unknown as Editor, dispatch };
}

function alignments(transaction: Transaction): (string | null)[] {
  const result: (string | null)[] = [];
  transaction.doc.firstChild?.forEach((row) => row.forEach((cell) => result.push(cell.attrs.align)));
  return result;
}

describe("setColumnAlignment with rowspan", () => {
  it("aligns the correct visual column when rowspan is present", () => {
    // Create a table with rowspan:
    // Row 1: [Cell A (rowspan=2)] [Cell B]
    // Row 2: [Cell C]  <- visually at column 1
    const cell = (value: string, align: string | null = null, rowspan: number = 1, colspan: number = 1) => schema.nodes.tableCell.create(
      { align, rowspan, colspan }, schema.nodes.paragraph.create(null, schema.text(value)),
    );

    const row1 = schema.nodes.tableRow.create(null, [
      cell("A", null, 2, 1),  // rowspan=2
      cell("B"),
    ]);
    const row2 = schema.nodes.tableRow.create(null, [
      cell("C"),  // This is visually at column 1
    ]);

    const doc = schema.nodes.doc.create(null, schema.nodes.table.create(null, [row1, row2]));

    // Find position inside Cell C
    let cPos = -1;
    doc.descendants((node, pos) => {
      if (node.type.name === "text" && node.text === "C") {
        cPos = pos;
        return false;
      }
      return true;
    });

    expect(cPos).toBeGreaterThan(0);

    const { editor, dispatch } = createEditorState(doc, cPos);

    // Apply alignment - should align visual column 1 (Cell B and Cell C)
    const result = setColumnAlignment(editor, "center");
    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);

    // Check that both Cell B (row 0, col 1) and Cell C (row 1, col 1) got aligned
    const tr = dispatch.mock.calls[0][0] as Transaction;
    const aligns = alignments(tr);
    // Expected: A=null, B=center, C=center
    expect(aligns).toEqual([null, "center", "center"]);
  });

  it("aligns column 0 when cursor is in rowspan cell", () => {
    // Same table, but cursor in Cell A (rowspan cell at visual column 0)
    const cell = (value: string, align: string | null = null, rowspan: number = 1, colspan: number = 1) => schema.nodes.tableCell.create(
      { align, rowspan, colspan }, schema.nodes.paragraph.create(null, schema.text(value)),
    );

    const row1 = schema.nodes.tableRow.create(null, [
      cell("A", null, 2, 1),  // rowspan=2
      cell("B"),
    ]);
    const row2 = schema.nodes.tableRow.create(null, [
      cell("C"),  // visually at column 1
    ]);

    const doc = schema.nodes.doc.create(null, schema.nodes.table.create(null, [row1, row2]));

    // Find position inside Cell A
    let aPos = -1;
    doc.descendants((node, pos) => {
      if (node.type.name === "text" && node.text === "A") {
        aPos = pos;
        return false;
      }
      return true;
    });

    expect(aPos).toBeGreaterThan(0);

    const { editor, dispatch } = createEditorState(doc, aPos);

    // Apply alignment - should align visual column 0 (Cell A only, since it spans both rows)
    const result = setColumnAlignment(editor, "right");
    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);

    const tr = dispatch.mock.calls[0][0] as Transaction;
    const aligns = alignments(tr);
    // Expected: A=right, B=null, C=null
    expect(aligns).toEqual(["right", null, null]);
  });
});
