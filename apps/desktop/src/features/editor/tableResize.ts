import type { Editor } from "@tiptap/react";
import { TableMap } from "@tiptap/pm/tables";

const edgeWidth = 10;
const minWidth = 120;

export type ResizeGesture = { tablePos: number; column: number; startX: number; startWidth: number; pointerId: number };

export function resizeTarget(editor: Editor, host: HTMLElement, event: PointerEvent) {
  const cellElement = (event.target as HTMLElement).closest<HTMLTableCellElement>("th, td");
  if (!cellElement || !host.contains(cellElement)) return null;
  const bounds = cellElement.getBoundingClientRect();
  const right = bounds.right - event.clientX <= edgeWidth;
  const left = event.clientX - bounds.left <= edgeWidth;
  if (!right && !left) return null;
  const pos = editor.view.posAtCoords({ left: bounds.left + bounds.width / 2, top: bounds.top + bounds.height / 2 })?.pos;
  if (pos === undefined) return null;
  const $pos = editor.state.doc.resolve(pos);
  let cellDepth = $pos.depth;
  while (cellDepth > 0 && !["tableCell", "tableHeader"].includes($pos.node(cellDepth).type.name)) cellDepth -= 1;
  let tableDepth = cellDepth - 1;
  while (tableDepth > 0 && $pos.node(tableDepth).type.name !== "table") tableDepth -= 1;
  if (!cellDepth || !tableDepth) return null;
  const table = $pos.node(tableDepth);
  const tablePos = $pos.before(tableDepth);
  const cellPos = $pos.before(cellDepth) - $pos.start(tableDepth);
  const map = TableMap.get(table);
  const cellColumn = map.colCount(cellPos);
  const column = right ? cellColumn + $pos.node(cellDepth).attrs.colspan - 1 : cellColumn - 1;
  if (column < 0 || column >= map.width) return null;
  const row = map.findCell(cellPos).top;
  const targetCellPos = map.map[row * map.width + column];
  const targetCell = table.nodeAt(targetCellPos);
  const targetDOM = editor.view.nodeDOM(tablePos + 1 + targetCellPos) as HTMLTableCellElement | null;
  const widthIndex = column - map.colCount(targetCellPos);
  const startWidth = targetCell?.attrs.colwidth?.[widthIndex] || targetDOM?.getBoundingClientRect().width || bounds.width;
  return { cellElement: targetDOM ?? cellElement, gesture: { tablePos, column, startWidth, startX: event.clientX } };
}

export function applyColumnWidth(editor: Editor, gesture: ResizeGesture, width: number) {
  const table = editor.state.doc.nodeAt(gesture.tablePos);
  if (!table || table.type.name !== "table") return;
  const map = TableMap.get(table);
  const tr = editor.state.tr;
  const updated = new Set<number>();
  for (let row = 0; row < map.height; row += 1) {
    const cellPos = map.map[row * map.width + gesture.column];
    if (updated.has(cellPos)) continue;
    updated.add(cellPos);
    const cell = table.nodeAt(cellPos);
    if (!cell) continue;
    const index = gesture.column - map.colCount(cellPos);
    const colwidth = cell.attrs.colwidth ? [...cell.attrs.colwidth] : Array(cell.attrs.colspan).fill(0);
    colwidth[index] = Math.max(minWidth, Math.round(width));
    tr.setNodeMarkup(gesture.tablePos + 1 + cellPos, undefined, { ...cell.attrs, colwidth });
  }
  if (tr.docChanged) editor.view.dispatch(tr);
}

export function clearColumnWidths(editor: Editor) {
  const tr = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    if (["tableCell", "tableHeader"].includes(node.type.name) && node.attrs.colwidth) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, colwidth: null });
    }
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}
