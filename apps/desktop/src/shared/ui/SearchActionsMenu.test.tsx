import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Entry } from "../domain/workspace";
import { SearchActionsMenu } from "./SearchActionsMenu";

afterEach(cleanup);

const file: Entry = { name: "Note.md", path: "Notes/Note.md", kind: "file" };
const directory: Entry = { name: "Notes", path: "Notes", kind: "directory" };
const position = { top: 12, left: 24 };

describe("SearchActionsMenu", () => {
  it("renders file content action in its body portal and selects actions", () => {
    const onAction = vi.fn();
    render(<SearchActionsMenu entry={file} position={position} onAction={onAction} onBack={vi.fn()} />);

    const menu = document.body.querySelector('[role="menu"][aria-label="Actions for Note.md"]');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveStyle({ top: "12px", left: "24px" });
    expect(menu?.querySelectorAll('[role="menuitem"]')).toHaveLength(6);

    const contentAction = menu?.querySelector<HTMLButtonElement>('[data-action="content"]');
    expect(contentAction).toHaveTextContent("Copy note content");
    fireEvent.click(contentAction!);
    expect(onAction).toHaveBeenCalledWith("content");
  });

  it("omits the file-only action for directories and selects a common action", () => {
    const onAction = vi.fn();
    render(<SearchActionsMenu entry={directory} position={position} onAction={onAction} onBack={vi.fn()} />);

    const menu = document.body.querySelector('[role="menu"][aria-label="Actions for Notes"]');
    expect(menu).toBeInTheDocument();
    expect(menu?.querySelectorAll('[role="menuitem"]')).toHaveLength(5);
    expect(menu?.querySelector('[data-action="content"]')).not.toBeInTheDocument();
    const relativePathAction = menu?.querySelector<HTMLButtonElement>('[data-action="relative-path"]');
    expect(relativePathAction).toBeInTheDocument();
    fireEvent.click(relativePathAction!);
    expect(onAction).toHaveBeenCalledWith("relative-path");
  });

  it.each(["Escape", "ArrowLeft"]) ("goes back on %s", (key) => {
    const onBack = vi.fn();
    render(<SearchActionsMenu entry={file} position={position} onAction={vi.fn()} onBack={onBack} />);
    const menu = document.body.querySelector('[role="menu"]')!;

    fireEvent.keyDown(menu, { key });
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("moves focus through menu items with arrow keys", () => {
    render(<SearchActionsMenu entry={directory} position={position} onAction={vi.fn()} onBack={vi.fn()} />);
    const menu = document.body.querySelector('[role="menu"]')!;
    const actions = menu.querySelectorAll<HTMLButtonElement>("button[data-action]");

    expect(document.activeElement).toBe(actions[0]);
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(actions[1]);
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(actions[0]);
  });
});
