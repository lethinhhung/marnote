import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Braces, Heading1, Heading2, Heading3, List, ListChecks, ListOrdered, Minus, Pilcrow, Quote, Table2 } from "lucide-react";

const choices = [
  { id: "paragraph", label: "Text", detail: "Plain paragraph", icon: Pilcrow },
  { id: "heading1", label: "Heading 1", detail: "Large section heading", icon: Heading1 },
  { id: "heading2", label: "Heading 2", detail: "Medium section heading", icon: Heading2 },
  { id: "heading3", label: "Heading 3", detail: "Small section heading", icon: Heading3 },
  { id: "bullet", label: "Bulleted list", detail: "Unordered list", icon: List },
  { id: "number", label: "Numbered list", detail: "Ordered list", icon: ListOrdered },
  { id: "task", label: "To-do list", detail: "Track tasks with checkboxes", icon: ListChecks },
  { id: "quote", label: "Quote", detail: "Capture a quotation", icon: Quote },
  { id: "code", label: "Code block", detail: "Code with fixed-width type", icon: Braces },
  { id: "table", label: "Table", detail: "Insert a Markdown table", icon: Table2 },
  { id: "divider", label: "Divider", detail: "Separate sections", icon: Minus },
];
export const matchingSlashIds = (query: string) => choices.filter(item => `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase())).map(item => item.id);

type Props = { query: string; selected: number; position: { top: number; left: number; maxHeight: number }; onSelect: (id: string) => void };

export function SlashMenu({ query, selected, position, onSelect }: Props) {
  const menu = useRef<HTMLDivElement>(null);
  const items = useMemo(() => choices.filter(item => `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => {
    menu.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [query, selected, items.length]);
  if (!items.length) return null;
  return createPortal(<div ref={menu} className="slash-menu" role="listbox" aria-label="Insert a block" style={position}>
    <div className="slash-menu-heading">BASIC BLOCKS</div>
    {items.map(({ id, label, detail, icon: Icon }, index) => <button key={id} type="button" role="option" aria-selected={index === selected} className={index === selected ? "slash-option selected" : "slash-option"} onMouseDown={event => event.preventDefault()} onClick={() => onSelect(id)}>
      <span className="slash-icon"><Icon size={16} /></span><span className="slash-label">{label}<small>{detail}</small></span>
    </button>)}
  </div>, document.body);
}
