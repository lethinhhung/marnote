import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MoveEntryDialog } from "./MoveEntryDialog";
import type { Entry } from "../workspaceTypes";

const entries: Entry[] = [
  { name: "Source", path: "Source", kind: "directory", children: [
    { name: "Child", path: "Source/Child", kind: "directory", children: [] },
  ] },
  { name: "Target", path: "Target", kind: "directory", children: [
    { name: "Nested", path: "Target/Nested", kind: "directory", children: [] },
  ] },
  { name: "note.md", path: "note.md", kind: "file" },
];

function renderDialog(props: Partial<React.ComponentProps<typeof MoveEntryDialog>> = {}) {
  const onMove = vi.fn().mockResolvedValue(true);
  const onClose = vi.fn();
  render(<MoveEntryDialog entries={entries} path="Source" folder onMove={onMove} onClose={onClose} {...props} />);
  return { onMove, onClose };
}

describe("MoveEntryDialog", () => {
  it("lists only valid folder destinations", () => {
    renderDialog();
    const select = screen.getByLabelText("Destination folder");
    const options = Array.from((select as HTMLSelectElement).options).map(option => option.value);
    expect(options).toEqual(["", "Target", "Target/Nested"]);
  });

  it("prevents a no-op move to the current parent", () => {
    const { onMove, onClose } = renderDialog({ path: "note.md", folder: false });
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onMove).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes only after a successful move", async () => {
    let resolveMove!: (success: boolean) => void;
    const onMove = vi.fn(() => new Promise<boolean>(resolve => { resolveMove = resolve; }));
    const onClose = vi.fn();
    renderDialog({ path: "note.md", folder: false, onMove, onClose });
    fireEvent.change(screen.getByLabelText("Destination folder"), { target: { value: "Target" } });
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onMove).toHaveBeenCalledWith("note.md", "Target/note.md");
    expect(onClose).not.toHaveBeenCalled();
    resolveMove(false);
    await waitFor(() => expect(screen.getByRole("button", { name: "Move" })).toBeEnabled());
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    resolveMove(true);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});