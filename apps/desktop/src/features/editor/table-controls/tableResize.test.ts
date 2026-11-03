import { describe, expect, it, vi, type Mock } from "vitest";
import { Schema, type Node, type SchemaSpec } from "@tiptap/pm/model";
import { EditorState, type Transaction } from "@tiptap/pm/state";
import { TableMap } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";
import { applyColumnWidth, clearColumnWidths, type ResizeGesture } from "./tableResize";

const spec = {
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    table: { content: "tableRow+", group: "block", tableRole: "table", isolating: true },
    tableRow: { content: "(tableCell | tableHeader)*", tableRole: "row" },
    tableCell: { content: "block+", tableRole: "cell", isolating: true, attrs: { colspan: { default: 1 }, rowspan: { default: 1 }, colwidth: { default: null } } },
    tableHeader: { content: "block+", tableRole: "header_cell", isolating: true, attrs: { colspan: { default: 1 }, rowspan: { default: 1 }, colwidth: { default: null } } },
  },
} as unknown as SchemaSpec;

const schema = new Schema(spec);

const header = (text: string) => schema.nodes.tableHeader.create(null, schema.nodes.paragraph.create(null, schema.text(text)));
const cell = (text: string, colwidth: number[] | null = null) =>
  schema.nodes.tableCell.create({ colwidth }, schema.nodes.paragraph.create(null, schema.text(text)));

const grid = (rows: Node[][]) =>
  schema.nodes.doc.create(null, schema.nodes.table.create(null, rows.map((row) => schema.nodes.tableRow.create(null, row))));

const twoByTwo = () => grid([[header("a"), header("b")], [cell("c"), cell("d")]]);

function setup(doc: Node) {
  const state = EditorState.create({ schema, doc });
  const dispatch = vi.fn();
  return { editor: { state, view: { dispatch } } as unknown as Editor, dispatch };
}

const gesture = (column: number): ResizeGesture => ({ tablePos: 0, column, startX: 0, startWidth: 0, pointerId: 1 });

function widths(dispatch: Mock): (number[] | null)[] {
  const tr = dispatch.mock.calls[0][0] as Transaction;
  const table = tr.doc.nodeAt(0)!;
  return TableMap.get(table).map.map((pos) => table.nodeAt(pos)!.attrs.colwidth);
}

describe("applyColumnWidth", () => {
  it("rounds the requested width for every cell in the column", () => {
    const { editor, dispatch } = setup(twoByTwo());
    applyColumnWidth(editor, gesture(0), 150.6);
    expect(widths(dispatch)).toEqual([[151], null, [151], null]);
  });

  it("never applies a width below 120 pixels", () => {
    const { editor, dispatch } = setup(twoByTwo());
    applyColumnWidth(editor, gesture(1), 40);
    expect(widths(dispatch)).toEqual([null, [120], null, [120]]);
  });

  it("does not dispatch when the target is not a table", () => {
    const doc = schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, schema.text("x")));
    const { editor, dispatch } = setup(doc);
    applyColumnWidth(editor, gesture(0), 200);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("clearColumnWidths", () => {
  it("resets every cell colwidth to null and dispatches", () => {
    const doc = grid([[cell("a", [200]), cell("b", [150])]]);
    const { editor, dispatch } = setup(doc);
    clearColumnWidths(editor);
    expect(widths(dispatch)).toEqual([null, null]);
  });

  it("does not dispatch when no cell has a width", () => {
    const { editor, dispatch } = setup(twoByTwo());
    clearColumnWidths(editor);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
