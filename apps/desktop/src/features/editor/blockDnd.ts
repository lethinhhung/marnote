import type { EditorView } from "@tiptap/pm/view";
import { Selection } from "@tiptap/pm/state";

type DropTarget = { position: number; lineY: number };

export function getBlockDropTarget(view: EditorView, clientY: number): DropTarget | null {
  const { doc } = view.state;
  let position = 0;
  for (let index = 0; index < doc.childCount; index += 1) {
    const node = doc.child(index);
    const element = view.nodeDOM(position);
    const bounds = element instanceof HTMLElement ? element.getBoundingClientRect() : null;
    if (bounds && clientY < bounds.top + bounds.height / 2) return { position, lineY: bounds.top };
    position += node.nodeSize;
    if (bounds) {
      if (clientY <= bounds.bottom) return { position, lineY: bounds.bottom };
      if (index === doc.childCount - 1) return { position, lineY: bounds.bottom };
    }
  }
  return doc.childCount ? { position: doc.content.size, lineY: view.dom.getBoundingClientRect().bottom } : null;
}

export function moveTopLevelBlock(view: EditorView, sourcePos: number, destination: number) {
  const source = view.state.doc.nodeAt(sourcePos);
  if (!source) return;
  const sourceEnd = sourcePos + source.nodeSize;
  if (destination >= sourcePos && destination <= sourceEnd) return;
  const transaction = view.state.tr.delete(sourcePos, sourceEnd);
  const insertAt = transaction.mapping.map(destination, destination < sourcePos ? -1 : 1);
  transaction.insert(insertAt, source);
  transaction.setSelection(Selection.near(transaction.doc.resolve(insertAt + 1)));
  view.dispatch(transaction.scrollIntoView());
}
