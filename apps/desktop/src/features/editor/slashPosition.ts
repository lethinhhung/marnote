import type { Editor } from "@tiptap/react";
import { matchingSlashIds } from "./SlashMenu";

export function slashPosition(editor: Editor, position: number, query: string) {
  const cursor = editor.view.coordsAtPos(position);
  const below = window.innerHeight - cursor.bottom - 12;
  const above = cursor.top - 12;
  const opensAbove = above > below;
  const maxHeight = Math.max(60, Math.min(340, (opensAbove ? above : below) - 12));
  const menuHeight = Math.min(maxHeight, 40 + matchingSlashIds(query).length * 45);
  return {
    top: Math.max(12, opensAbove ? cursor.top - menuHeight - 6 : cursor.bottom + 6),
    left: Math.max(12, Math.min(cursor.left, window.innerWidth - 282)),
    maxHeight,
  };
}
