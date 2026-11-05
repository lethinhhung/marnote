import { useEffect, useRef, useState } from "react";
import { NoteFooterContent } from "./NoteFooterContent";

function positionFooterMenus(footer: HTMLElement): void {
  footer.querySelectorAll<HTMLDetailsElement>(".note-footer-menu[open]").forEach(menu => {
    const trigger = menu.querySelector("summary")?.getBoundingClientRect();
    const popup = menu.querySelector<HTMLElement>(".note-footer-popup");
    if (!trigger || !popup) return;
    const bounds = popup.getBoundingClientRect();
    const left = Math.max(8, Math.min(trigger.right - bounds.width, window.innerWidth - bounds.width - 8));
    const above = trigger.top - bounds.height - 8;
    const top = above >= 8 ? above : Math.min(trigger.bottom + 8, window.innerHeight - bounds.height - 8);
    popup.style.left = `${left}px`;
    popup.style.top = `${Math.max(8, top)}px`;
    popup.dataset.positioned = "true";
  });
}

export function NoteFooter({ value, path, kind, saveStatus, saveMode, dirty, onSaveModeChange, metadata, updateMetadata, tags = {} }: { value: string; path: string; kind: "note" | "folder"; saveStatus: "saved" | "saving" | "error"; saveMode: "automatic" | "manual"; dirty: boolean; onSaveModeChange: (mode: "automatic" | "manual") => void; metadata?: { createdMs?: number; updatedMs?: number; tags?: string[]; icon?: string; favorite?: boolean }; updateMetadata?: (path: string, metadata: { icon?: string; tags?: string[]; favorite?: boolean }) => void; tags?: Record<string, string> }) {
  const footerRef = useRef<HTMLElement>(null);
  const resizeTimer = useRef<number | undefined>(undefined);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      window.clearTimeout(resizeTimer.current);
      resizeTimer.current = window.setTimeout(() => {
        setCompact(entry.contentRect.width < 950);
        positionFooterMenus(footer);
      }, 100);
    });
    const reposition = () => positionFooterMenus(footer);
    const dismissMenus = (event: Event) => {
      const target = event.target as Node;
      const targetElement = event.target instanceof Element ? event.target : null;
      footer.querySelectorAll<HTMLDetailsElement>(".note-footer-menu[open]").forEach(menu => {
        if (menu.contains(target)) return;
        const pickerOpen = menu.querySelector('.tag-picker-wrap [aria-expanded="true"], .emoji-picker [aria-expanded="true"]');
        if (pickerOpen && targetElement?.closest(".tag-picker-layer, .emoji-picker-popover")) return;
        menu.open = false;
      });
    };
    observer.observe(footer);
    window.addEventListener("resize", reposition);
    document.addEventListener("pointerdown", dismissMenus);
    document.addEventListener("focusin", dismissMenus);
    return () => { observer.disconnect(); window.clearTimeout(resizeTimer.current); window.removeEventListener("resize", reposition); document.removeEventListener("pointerdown", dismissMenus); document.removeEventListener("focusin", dismissMenus); };
  }, []);

  return (
    <NoteFooterContent
      ref={footerRef}
      value={value}
      path={path}
      kind={kind}
      saveStatus={saveStatus}
      saveMode={saveMode}
      dirty={dirty}
      onSaveModeChange={onSaveModeChange}
      metadata={metadata}
      updateMetadata={updateMetadata}
      tags={tags}
      compact={compact}
      positionFooterMenus={positionFooterMenus}
    />
  );
}