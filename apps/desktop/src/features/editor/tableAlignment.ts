import type { Editor } from "@tiptap/react";
import { TableMap } from "@tiptap/pm/tables";

export type TableAlignment = "left" | "center" | "right";

export function setColumnAlignment(editor: Editor, align: TableAlignment) {
  const { $from } = editor.state.selection;
  let cellDepth = $from.depth;
  while (cellDepth > 0 && !["tableCell", "tableHeader"].includes($from.node(cellDepth).type.name)) cellDepth--;
  if (!cellDepth) return false;
  const tableDepth = cellDepth - 2;
  if (tableDepth < 0 || $from.node(tableDepth).type.name !== "table") return false;
  const table = $from.node(tableDepth);
  const tablePos = $from.before(tableDepth);
  const map = TableMap.get(table);
  const cellPos = $from.before(cellDepth) - $from.start(tableDepth);
  const column = map.colCount(cellPos);
  if (column >= map.width) return false;
  const transaction = editor.state.tr;
  const updated = new Set<number>();
  for (let row = 0; row < map.height; row += 1) {
    const cellPos = map.map[row * map.width + column];
    if (updated.has(cellPos)) continue;
    updated.add(cellPos);
    const cell = table.nodeAt(cellPos);
    if (cell) transaction.setNodeMarkup(tablePos + 1 + cellPos, undefined, { ...cell.attrs, align });
  }
  if (!transaction.docChanged) return false;
  editor.view.dispatch(transaction);
  return true;
}
