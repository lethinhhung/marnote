import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Copy, FileText, Pencil, Trash2 } from "lucide-react";
import type { Entry } from "../domain/workspace";
import type { SearchTargetAction } from "./searchActions";

type Props = { entry: Entry; position: { top: number; left: number }; onAction: (action: SearchTargetAction) => void; onBack: () => void };

export function SearchActionsMenu({ entry, position, onAction, onBack }: Props) {
  const menu = useRef<HTMLDivElement>(null);
  const actions: { label: string; action: SearchTargetAction; icon: ReactNode }[] = [
    { label: "Copy internal link", action: "link", icon: <Copy size={14} /> },
    { label: "Copy relative path", action: "relative-path", icon: <Copy size={14} /> },
    { label: "Copy full path", action: "full-path", icon: <Copy size={14} /> },
    ...(entry.kind === "file" ? [{ label: "Copy note content", action: "content" as const, icon: <FileText size={14} /> }] : []),
    { label: "Rename in Explorer", action: "rename", icon: <Pencil size={14} /> },
    { label: "Move to trash", action: "remove", icon: <Trash2 size={14} /> },
  ];
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "ArrowLeft") { event.preventDefault(); event.stopPropagation(); onBack(); return; }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>("button[data-action]") ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(index + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus();
    event.preventDefault();
  };
  return createPortal(<div ref={menu} className="folder-context-menu search-action-context-menu" style={{ position: "fixed", zIndex: 1000, top: position.top, left: position.left }} role="menu" aria-label={`Actions for ${entry.name}`} onKeyDown={onKeyDown}>
      {actions.map((item, index) => <button autoFocus={index === 0} data-action={item.action} role="menuitem" type="button" key={item.action} className={item.action === "remove" ? "danger" : undefined} onClick={() => onAction(item.action)}>{item.icon}<span>{item.label}</span></button>)}
  </div>, document.body);
}
