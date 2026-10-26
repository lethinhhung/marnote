import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchPalette } from "./SearchPalette";
import type { Entry, WorkspaceTree } from "../domain/workspace";
import { readFile } from "../../platform/workspace";

vi.mock("../../platform/workspace", () => ({ readFile: vi.fn() }));

describe("SearchPalette", () => {
  beforeEach(() => vi.mocked(readFile).mockResolvedValue({
    path: "Notes/meeting.md",
    content: "Agenda and decisions",
    modifiedMs: 1,
  }));

  it("selects a matching note and closes the palette", async () => {
    const note: Entry = { name: "meeting.md", path: "Notes/meeting.md", kind: "file", modifiedMs: 1 };
    const tree: WorkspaceTree = {
      name: "Workspace",
      path: "/test/search-palette",
      entries: [{ name: "Notes", path: "Notes", kind: "directory", children: [note] }],
    };
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(<SearchPalette
      tree={tree}
      currentPath=""
      currentContent=""
      onSelect={onSelect}
      onCreate={vi.fn()}
      onCapture={vi.fn()}
      onCopy={vi.fn()}
      onQuickAction={vi.fn()}
      onClose={onClose}
    />);

    fireEvent.change(screen.getByRole("textbox", { name: "Search notes, files, and actions" }), { target: { value: "Agenda" } });
    fireEvent.click(await screen.findByRole("option", { name: /meeting\.md/ }));

    expect(onSelect).toHaveBeenCalledWith(note);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
