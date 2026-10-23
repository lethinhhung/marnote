import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoteTabs } from "./NoteTabs";

function renderTabs() {
  const callbacks = {
    onSelect: vi.fn(), onClose: vi.fn(), onCloseOthers: vi.fn(),
    onCloseAll: vi.fn(), onCreate: vi.fn(), onReorder: vi.fn(),
  };
  render(<NoteTabs
    paths={["One.md", "Folder/Two.md"]} activePath="One.md"
    canCreate {...callbacks}
  />);
  return callbacks;
}

describe("NoteTabs", () => {
  it("selects the clicked tab and marks the active tab", () => {
    const { onSelect } = renderTabs();

    expect(screen.getByRole("tab", { name: "One.md" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Two.md" })).toHaveAttribute("aria-selected", "false");
    fireEvent.click(screen.getByRole("tab", { name: "Two.md" }));

    expect(onSelect).toHaveBeenCalledWith("Folder/Two.md");
  });

  it("closes a tab from its close button without selecting it", () => {
    const { onClose, onSelect } = renderTabs();
    fireEvent.click(screen.getByRole("button", { name: "Close Two.md" }));

    expect(onClose).toHaveBeenCalledWith("Folder/Two.md");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("offers close actions in the tab context menu", () => {
    const { onClose, onCloseOthers, onCloseAll } = renderTabs();
    fireEvent.contextMenu(screen.getByRole("tab", { name: "Two.md" }), { clientX: 40, clientY: 50 });
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Close others" }));
    expect(onCloseOthers).toHaveBeenCalledWith("Folder/Two.md");
    expect(onClose).not.toHaveBeenCalled();
    expect(onCloseAll).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByRole("tab", { name: "One.md" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Close all" }));
    expect(onCloseAll).toHaveBeenCalledOnce();
  });

  it("creates a note when the add button is enabled", () => {
    const { onCreate } = renderTabs();
    fireEvent.click(screen.getByRole("button", { name: "New note" }));

    expect(onCreate).toHaveBeenCalledOnce();
  });
});
