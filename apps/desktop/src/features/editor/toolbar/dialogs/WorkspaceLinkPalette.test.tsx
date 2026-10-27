import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Entry } from "../../../../shared/domain/workspace";
import { WorkspaceLinkPalette } from "./WorkspaceLinkPalette";

const entry = (name: string, path: string, kind: Entry["kind"] = "file"): Entry => ({
  name,
  path,
  kind,
});

const links: Entry[] = [
  entry("Projects", "Projects", "directory"),
  entry("Roadmap.md", "Projects/Roadmap.md"),
  entry("Meeting Notes.md", "Meeting Notes.md"),
];

describe("WorkspaceLinkPalette", () => {
  it("filters workspace links by name and path, ignoring case", () => {
    render(<WorkspaceLinkPalette entries={links} onClose={vi.fn()} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Search notes and folders" }), {
      target: { value: "PROJECTS/road" },
    });

    const listbox = within(document.body).getByRole("listbox", { name: "Workspace items" });
    expect(within(listbox).getByRole("option", { name: /Roadmap\.md/ })).toBeInTheDocument();
    expect(within(listbox).queryByRole("option", { name: /Meeting Notes\.md/ })).not.toBeInTheDocument();
    expect(within(listbox).queryByRole("option", { name: /^Projects/ })).not.toBeInTheDocument();
  });

  it("selects the next result with ArrowDown and Enter", () => {
    const onSelect = vi.fn();
    render(<WorkspaceLinkPalette entries={links} onClose={vi.fn()} onSelect={onSelect} />);
    const dialog = within(document.body).getByRole("dialog", { name: "Link to a note or folder" });

    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    fireEvent.keyDown(dialog, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(links[1]);
  });

  it("dismisses on Escape", () => {
    const onClose = vi.fn();
    render(<WorkspaceLinkPalette entries={links} onClose={onClose} onSelect={vi.fn()} />);
    fireEvent.keyDown(within(document.body).getByRole("dialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });
});