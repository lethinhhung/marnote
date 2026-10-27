import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrashDialog } from "./TrashDialog";
import type { TrashItem } from "../../../platform/workspace";

const items: TrashItem[] = [
  { id: "note-id", path: "notes/old.md", kind: "file", restorable: true },
  { id: "gone-id", path: "notes/gone.md", kind: "file", restorable: false },
];

function renderTrash(overrides: Partial<React.ComponentProps<typeof TrashDialog>> = {}) {
  const props = { items: [], load: vi.fn(), restore: vi.fn(), empty: vi.fn(), close: vi.fn(), ...overrides };
  return { ...render(<TrashDialog {...props} />), props };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TrashDialog", () => {
  it("loads trash when mounted and refreshes on request", () => {
    const { props } = renderTrash();
    expect(props.load).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(props.load).toHaveBeenCalledTimes(2);
  });

  it("restores restorable items by id and omits restore for permanent items", () => {
    const { props } = renderTrash({ items });
    fireEvent.click(screen.getByRole("button", { name: "Restore notes/old.md" }));
    expect(props.restore).toHaveBeenCalledOnce();
    expect(props.restore).toHaveBeenCalledWith("note-id");
    expect(screen.queryByRole("button", { name: "Restore notes/gone.md" })).not.toBeInTheDocument();
  });

  it("confirms before emptying non-empty trash", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { props } = renderTrash({ items });
    fireEvent.click(screen.getByRole("button", { name: /empty trash/i }));
    expect(confirm).toHaveBeenCalledWith("Permanently delete all items in this workspace's trash? This cannot be undone.");
    expect(props.empty).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /empty trash/i }));
    expect(props.empty).toHaveBeenCalledOnce();
  });

  it("handles Escape, traps Tab at both ends, and closes on backdrop click", () => {
    const { props } = renderTrash({ items });
    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "Close trash" });
    const last = screen.getByRole("button", { name: /empty trash/i });
    close.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(props.close).toHaveBeenCalledOnce();
    fireEvent.mouseDown(screen.getByRole("presentation"));
    expect(props.close).toHaveBeenCalledTimes(2);
  });
});
