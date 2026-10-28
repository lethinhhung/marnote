import type { Editor } from "@tiptap/react";

export type TableAlignment = "left" | "center" | "right";

export function setColumnAlignment(editor: Editor, align: TableAlignment) {
  const { $from } = editor.state.selection;
  let cellDepth = $from.depth;
  while (cellDepth > 0 && !["tableCell", "tableHeader"].includes($from.node(cellDepth).type.name)) cellDepth--;
  if (!cellDepth) return false;
  const rowDepth = cellDepth - 1;
  const tableDepth = cellDepth - 2;
  if (tableDepth < 0 || $from.node(tableDepth).type.name !== "table") return false;
  const column = $from.index(rowDepth);
  const table = $from.node(tableDepth);
  const tablePos = $from.before(tableDepth);
  const transaction = editor.state.tr;
  table.forEach((row, rowOffset) => {
    row.forEach((cell, cellOffset, cellIndex) => {
      if (cellIndex !== column) return;
      const cellPos = tablePos + 2 + rowOffset + cellOffset;
      transaction.setNodeMarkup(cellPos, undefined, { ...cell.attrs, align });
    });
  });
  if (!transaction.docChanged) return false;
  editor.view.dispatch(transaction);
  return true;
}
