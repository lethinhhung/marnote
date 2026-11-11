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
  const cellPos = $from.before(cellDepth);
  const map = TableMap.get(table);
  const cellIndex = cellPos - tablePos - 1;
  const column = map.colCount(cellIndex);
  const transaction = editor.state.tr;
  const updated = new Set<number>();
  for (let row = 0; row < map.height; row++) {
    const targetCellPos = map.map[row * map.width + column];
    if (updated.has(targetCellPos)) continue;
    updated.add(targetCellPos);
    const cell = table.nodeAt(targetCellPos);
    if (!cell) continue;
    const pos = tablePos + 1 + targetCellPos;
    transaction.setNodeMarkup(pos, undefined, { ...cell.attrs, align });
  }
  if (!transaction.docChanged) return false;
  editor.view.dispatch(transaction);
  return true;
}
